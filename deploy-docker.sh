#!/bin/bash

echo "🚀 开始 Docker 部署..."

# 1. 确保已登录 Q CLI
echo "🔐 检查 Q CLI 认证..."
if [ ! -f ~/.aws/amazonq/credentials ]; then
    echo "❌ 请先运行: q login --license free"
    exit 1
fi

# 2. 构建镜像
echo "🔨 构建 Docker 镜像..."
docker build -f Dockerfile.q-base -t ai-backend:latest .

# 3. 启动服务
echo "🚀 启动服务..."
docker-compose up -d

# 4. 检查状态
echo "📊 检查服务状态..."
sleep 5
docker-compose ps
docker-compose logs --tail=20

echo "✅ 部署完成！"
echo "🌐 访问地址: http://localhost:3001"
echo "📊 查看日志: docker-compose logs -f"
