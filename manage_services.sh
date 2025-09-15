#!/bin/bash

PROJECT_DIR="/home/yjw/Ai-1.0"

case "$1" in
    start)
        echo "启动 Ai-1.0 服务..."
        cd $PROJECT_DIR
        nohup yarn server > server.log 2>&1 &
        nohup yarn vite > frontend.log 2>&1 &
        sleep 3
        echo "服务启动完成！"
        echo "后端服务: http://localhost:3001"
        echo "前端服务: http://localhost:5173"
        ;;
    stop)
        echo "停止 Ai-1.0 服务..."
        pkill -f "node.*server.js"
        pkill -f "vite"
        echo "服务已停止"
        ;;
    status)
        echo "检查服务状态..."
        ps aux | grep -E "(node.*server.js|vite)" | grep -v grep
        ;;
    logs)
        echo "=== 后端日志 ==="
        tail -10 $PROJECT_DIR/server.log
        echo "=== 前端日志 ==="
        tail -10 $PROJECT_DIR/frontend.log
        ;;
    *)
        echo "用法: $0 {start|stop|status|logs}"
        exit 1
        ;;
esac
