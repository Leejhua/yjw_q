#!/bin/bash

# 服务保持脚本
PROJECT_DIR="/home/yjw/Ai-1.0"
FRONTEND_PORT=5173
BACKEND_PORT=3001

cd "$PROJECT_DIR"

# 检查并启动前端
check_frontend() {
    if ! curl -s http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
        echo "$(date): 前端服务异常，重启中..."
        pkill -f "vite|yarn.*dev"
        sleep 2
        nohup yarn dev > frontend.log 2>&1 &
        sleep 5
    fi
}

# 检查并启动后端
check_backend() {
    if ! curl -s http://localhost:$BACKEND_PORT > /dev/null 2>&1; then
        echo "$(date): 后端服务异常，重启中..."
        pkill -f "node.*server"
        sleep 2
        cd "$PROJECT_DIR"
        nohup node server/server.js > backend.log 2>&1 &
        sleep 3
    fi
}

# 主循环
while true; do
    check_frontend
    check_backend
    sleep 30  # 每30秒检查一次
done
