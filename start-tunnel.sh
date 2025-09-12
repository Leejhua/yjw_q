#!/bin/bash

# 启动 Cloudflare Tunnel
echo "🚀 启动 Cloudflare Tunnel..."

# 检查配置文件是否存在
if [ ! -f "/home/yjw/.cloudflared/config.yml" ]; then
    echo "❌ 配置文件不存在: /home/yjw/.cloudflared/config.yml"
    exit 1
fi

# 启动 tunnel
nohup cloudflared tunnel --config /home/yjw/.cloudflared/config.yml run my-api-tunnel > tunnel.log 2>&1 &

echo "✅ Tunnel 已启动！"
echo "📊 查看日志: tail -f tunnel.log"
echo "🌐 访问地址: https://api.example.com"
