#!/bin/bash

# 一键启动所有服务
cd /home/yjw/Ai-1.0

echo "🚀 启动AI助手服务..."

# 停止现有服务
pkill -f "vite|yarn|node.*server|keep-services"
sleep 2

# 启动后端
echo "📡 启动后端服务..."
nohup node server/server.js > backend.log 2>&1 &
sleep 3

# 启动前端
echo "🌐 启动前端服务..."
nohup yarn dev > frontend.log 2>&1 &
sleep 5

# 启动服务监控
echo "👁️ 启动服务监控..."
nohup ./keep-services.sh > monitor.log 2>&1 &

echo "✅ 所有服务已启动！"
echo "📱 前端: http://localhost:5173"
echo "🔧 后端: http://localhost:3001"
echo "📊 查看日志: tail -f *.log"
