#!/bin/bash

BACKEND_PORT=3001
FRONTEND_PORT=5173
CHECK_INTERVAL=30
LOG_FILE="/home/yjw/Ai-1.0/logs/auto-restart.log"

# 创建日志目录
mkdir -p /home/yjw/Ai-1.0/logs

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 检查端口是否在使用
check_port() {
    local port=$1
    netstat -tuln | grep ":$port " > /dev/null 2>&1
    return $?
}

# 启动后端服务
start_backend() {
    log "🚀 启动后端服务..."
    cd /home/yjw/Ai-1.0
    nohup node server.js > logs/backend.log 2>&1 &
    echo $! > logs/backend.pid
    sleep 3
    if check_port $BACKEND_PORT; then
        log "✅ 后端服务启动成功 (PID: $(cat logs/backend.pid))"
    else
        log "❌ 后端服务启动失败"
    fi
}

# 启动前端服务
start_frontend() {
    log "🚀 启动前端服务..."
    cd /home/yjw/Ai-1.0
    nohup npm run dev > logs/frontend.log 2>&1 &
    echo $! > logs/frontend.pid
    sleep 5
    if check_port $FRONTEND_PORT; then
        log "✅ 前端服务启动成功 (PID: $(cat logs/frontend.pid))"
    else
        log "❌ 前端服务启动失败"
    fi
}

# 停止服务
stop_services() {
    log "🛑 停止所有服务..."
    
    # 停止后端
    if [ -f logs/backend.pid ]; then
        kill $(cat logs/backend.pid) 2>/dev/null
        rm -f logs/backend.pid
    fi
    
    # 停止前端
    if [ -f logs/frontend.pid ]; then
        kill $(cat logs/frontend.pid) 2>/dev/null
        rm -f logs/frontend.pid
    fi
    
    # 强制杀死相关进程
    pkill -f "node server.js" 2>/dev/null
    pkill -f "npm run dev" 2>/dev/null
    
    log "✅ 服务已停止"
}

# 监控和自动重启
monitor() {
    log "👁️ 开始监控服务，每${CHECK_INTERVAL}秒检查一次..."
    
    while true; do
        # 检查后端
        if ! check_port $BACKEND_PORT; then
            log "⚠️ 后端服务异常，正在重启..."
            start_backend
        fi
        
        # 检查前端
        if ! check_port $FRONTEND_PORT; then
            log "⚠️ 前端服务异常，正在重启..."
            start_frontend
        fi
        
        sleep $CHECK_INTERVAL
    done
}

case "$1" in
    start)
        stop_services
        start_backend
        start_frontend
        log "🎉 服务启动完成！"
        echo "后端服务: http://localhost:$BACKEND_PORT"
        echo "前端服务: http://localhost:$FRONTEND_PORT"
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        sleep 2
        start_backend
        start_frontend
        ;;
    monitor)
        # 后台运行监控
        nohup $0 _monitor > logs/monitor.log 2>&1 &
        echo $! > logs/monitor.pid
        log "🔍 监控服务已启动 (PID: $(cat logs/monitor.pid))"
        echo "查看监控日志: tail -f logs/monitor.log"
        ;;
    _monitor)
        monitor
        ;;
    stop-monitor)
        if [ -f logs/monitor.pid ]; then
            kill $(cat logs/monitor.pid) 2>/dev/null
            rm -f logs/monitor.pid
            log "🛑 监控服务已停止"
        fi
        ;;
    status)
        echo "=== 服务状态 ==="
        if check_port $BACKEND_PORT; then
            echo "✅ 后端服务: 运行中 (端口 $BACKEND_PORT)"
        else
            echo "❌ 后端服务: 未运行"
        fi
        
        if check_port $FRONTEND_PORT; then
            echo "✅ 前端服务: 运行中 (端口 $FRONTEND_PORT)"
        else
            echo "❌ 前端服务: 未运行"
        fi
        
        if [ -f logs/monitor.pid ] && kill -0 $(cat logs/monitor.pid) 2>/dev/null; then
            echo "✅ 监控服务: 运行中 (PID: $(cat logs/monitor.pid))"
        else
            echo "❌ 监控服务: 未运行"
        fi
        ;;
    logs)
        echo "=== 最近的日志 ==="
        tail -20 "$LOG_FILE"
        ;;
    *)
        echo "用法: $0 {start|stop|restart|monitor|stop-monitor|status|logs}"
        echo ""
        echo "命令说明:"
        echo "  start        - 启动前后端服务"
        echo "  stop         - 停止所有服务"
        echo "  restart      - 重启服务"
        echo "  monitor      - 启动自动监控重启"
        echo "  stop-monitor - 停止监控服务"
        echo "  status       - 查看服务状态"
        echo "  logs         - 查看日志"
        exit 1
        ;;
esac
