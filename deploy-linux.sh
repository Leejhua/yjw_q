#!/bin/bash

echo "🚀 开始部署AI助手后端..."

# 构建Docker镜像
echo "📦 构建Docker镜像..."
docker build -t ai-assistant-backend .

# 停止旧容器（如果存在）
echo "🛑 停止旧容器..."
docker stop ai-assistant-backend 2>/dev/null
docker rm ai-assistant-backend 2>/dev/null

# 启动新容器
echo "🚀 启动后端服务..."
docker run -d \
  --name ai-assistant-backend \
  -p 3001:3001 \
  -v ~/.aws:/home/quser/.aws \
  -v $(pwd):/home/quser/workspace \
  ai-assistant-backend

echo "✅ 后端部署完成！"
echo "🌐 后端地址: http://localhost:3001"
echo "📱 前端地址: https://ai-1-0-rust.vercel.app"
