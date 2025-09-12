#!/bin/bash

# 在云服务器上安装 Q CLI
echo "🔧 安装 Q CLI..."

# 检查系统类型
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux 系统
    curl -fsSL https://q.aws.dev/install.sh | bash
    
    # 添加到 PATH
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
    source ~/.bashrc
    
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS 系统
    brew install q-cli
fi

# 验证安装
if command -v q &> /dev/null; then
    echo "✅ Q CLI 安装成功"
    q --version
else
    echo "❌ Q CLI 安装失败"
    exit 1
fi
