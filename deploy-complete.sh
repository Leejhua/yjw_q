#!/bin/bash

echo "🚀 开始完整部署 Amazon Q CLI + Cloudflare Tunnel..."

# 1. 检查环境
echo "📋 检查环境..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "📦 安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 2. 创建项目目录
PROJECT_DIR="$HOME/q-api-server"
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

echo "📁 项目目录: $PROJECT_DIR"

# 3. 创建 API 服务器
cat > server.js << 'EOF'
const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// 健康检查
app.get('/', (req, res) => {
  res.json({ status: 'Q CLI API Server Running', timestamp: new Date().toISOString() });
});

// Q CLI 对话接口
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: '消息不能为空' });
  }

  try {
    // 调用 Docker 容器中的 Q CLI
    const qProcess = spawn('docker', [
      'exec', 'q-cli-container',
      'q', 'chat', '--non-interactive'
    ], { stdio: 'pipe' });

    let output = '';
    let errorOutput = '';

    qProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    qProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    // 发送消息到 Q CLI
    qProcess.stdin.write(message + '\n');
    qProcess.stdin.end();

    qProcess.on('close', (code) => {
      if (code === 0) {
        res.json({
          success: true,
          response: output.trim() || '收到您的消息，Q CLI 正在处理中...',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          error: 'Q CLI 执行失败',
          details: errorOutput,
          fallback: '抱歉，Q CLI 暂时不可用，请稍后重试。'
        });
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'API 服务器错误',
      message: error.message,
      fallback: '服务暂时不可用，请稍后重试。'
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Q CLI API Server 运行在 http://localhost:${PORT}`);
  console.log(`📡 API 端点: http://localhost:${PORT}/api/chat`);
});
EOF

# 4. 创建 package.json
cat > package.json << 'EOF'
{
  "name": "q-cli-api-server",
  "version": "1.0.0",
  "description": "Amazon Q CLI API Server",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
EOF

# 5. 安装依赖
echo "📦 安装 Node.js 依赖..."
npm install

# 6. 创建 Q CLI Docker 容器
echo "🐳 创建 Q CLI Docker 容器..."

# 创建 Dockerfile
cat > Dockerfile << 'EOF'
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC
ENV LANG=C.UTF-8

# 安装基础工具
RUN apt-get update && apt-get install -y \
    curl \
    git \
    jq \
    python3 \
    python3-pip \
    ca-certificates \
    gnupg \
    lsb-release \
    unzip \
    vim \
    wget \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# 创建用户
RUN useradd -m -s /bin/bash -u 1000 quser \
    && echo "quser ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# 安装 Amazon Q CLI
RUN ARCH=$(uname -m) \
    && if [ "$ARCH" = "x86_64" ]; then \
        curl --proto '=https' --tlsv1.2 -sSf \
            https://desktop-release.q.us-east-1.amazonaws.com/latest/amazon-q.deb \
            -o /tmp/amazon-q.deb \
        && apt-get update \
        && apt-get install -y /tmp/amazon-q.deb \
        && rm /tmp/amazon-q.deb \
        && rm -rf /var/lib/apt/lists/*; \
    else \
        echo "使用备用安装方法..." \
        && curl -L -o /tmp/q.zip "https://github.com/aws/amazon-q-developer-cli/releases/latest/download/q-linux-x64.zip" \
        && unzip /tmp/q.zip -d /tmp \
        && chmod +x /tmp/q \
        && mv /tmp/q /usr/local/bin/ \
        && rm /tmp/q.zip; \
    fi

USER quser
RUN mkdir -p /home/quser/.aws/amazonq \
    && mkdir -p /home/quser/.amazonq

WORKDIR /home/quser/workspace
ENV Q_LOG_LEVEL=info
ENV PATH="/home/quser/.local/bin:/usr/local/bin:${PATH}"

CMD ["/bin/bash", "-c", "while true; do sleep 30; done"]
EOF

# 7. 构建并启动 Docker 容器
echo "🔨 构建 Docker 镜像..."
docker build -t q-cli-local .

echo "🚀 启动 Q CLI 容器..."
docker run -d \
  --name q-cli-container \
  -v ~/.aws:/home/quser/.aws:ro \
  -v $(pwd):/home/quser/workspace \
  q-cli-local

# 等待容器启动
sleep 5

# 8. 启动 API 服务器（后台运行）
echo "🌐 启动 API 服务器..."
nohup npm start > api-server.log 2>&1 &
API_PID=$!
echo $API_PID > api-server.pid

sleep 3

# 9. 安装 Cloudflare Tunnel
echo "☁️ 安装 Cloudflare Tunnel..."
if ! command -v cloudflared &> /dev/null; then
    # 下载 cloudflared
    wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    sudo dpkg -i cloudflared-linux-amd64.deb
    rm cloudflared-linux-amd64.deb
fi

# 10. 创建 Cloudflare Tunnel 配置
echo "🔧 配置 Cloudflare Tunnel..."

cat > tunnel-config.yml << 'EOF'
tunnel: q-cli-api
credentials-file: /home/quser/.cloudflared/q-cli-api.json

ingress:
  - hostname: "*.trycloudflare.com"
    service: http://localhost:5000
  - service: http_status:404
EOF

# 11. 启动 Cloudflare Tunnel（临时隧道，免费无需注册）
echo "🌍 启动 Cloudflare Tunnel..."
echo "正在创建临时隧道..."

# 启动临时隧道（后台运行）
nohup cloudflared tunnel --url http://localhost:5000 > tunnel.log 2>&1 &
TUNNEL_PID=$!
echo $TUNNEL_PID > tunnel.pid

# 等待隧道启动并获取 URL
echo "⏳ 等待隧道启动..."
sleep 10

# 从日志中提取 URL
TUNNEL_URL=""
for i in {1..30}; do
    if [ -f tunnel.log ]; then
        TUNNEL_URL=$(grep -o 'https://.*\.trycloudflare\.com' tunnel.log | head -1)
        if [ ! -z "$TUNNEL_URL" ]; then
            break
        fi
    fi
    sleep 2
done

# 12. 输出结果
echo ""
echo "🎉 部署完成！"
echo "=================================="
echo "📍 项目目录: $PROJECT_DIR"
echo "🐳 Docker 容器: q-cli-container"
echo "🌐 本地 API: http://localhost:5000"
echo "☁️ 公网 API: $TUNNEL_URL"
echo "=================================="
echo ""
echo "📋 API 使用示例:"
echo "curl -X POST $TUNNEL_URL/api/chat \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"message\":\"你好，请介绍一下自己\"}'"
echo ""
echo "🔧 管理命令:"
echo "查看 API 日志: tail -f $PROJECT_DIR/api-server.log"
echo "查看隧道日志: tail -f $PROJECT_DIR/tunnel.log"
echo "停止服务: $PROJECT_DIR/stop-services.sh"
echo ""

# 13. 创建停止服务脚本
cat > stop-services.sh << 'EOF'
#!/bin/bash
echo "🛑 停止所有服务..."

# 停止 API 服务器
if [ -f api-server.pid ]; then
    API_PID=$(cat api-server.pid)
    kill $API_PID 2>/dev/null
    rm api-server.pid
    echo "✅ API 服务器已停止"
fi

# 停止 Cloudflare Tunnel
if [ -f tunnel.pid ]; then
    TUNNEL_PID=$(cat tunnel.pid)
    kill $TUNNEL_PID 2>/dev/null
    rm tunnel.pid
    echo "✅ Cloudflare Tunnel 已停止"
fi

# 停止 Docker 容器
docker stop q-cli-container 2>/dev/null
docker rm q-cli-container 2>/dev/null
echo "✅ Docker 容器已停止"

echo "🎉 所有服务已停止"
EOF

chmod +x stop-services.sh

# 14. 测试 API
echo "🧪 测试 API..."
sleep 5

if [ ! -z "$TUNNEL_URL" ]; then
    echo "测试公网 API..."
    curl -s -X POST "$TUNNEL_URL/api/chat" \
      -H "Content-Type: application/json" \
      -d '{"message":"Hello"}' | head -200
    echo ""
    echo "✅ 公网 API 地址: $TUNNEL_URL"
    echo "📝 请将此地址配置到 Vercel 前端"
else
    echo "⚠️ 隧道 URL 获取失败，请查看 tunnel.log"
fi

echo ""
echo "🎊 部署完成！服务正在后台运行..."
