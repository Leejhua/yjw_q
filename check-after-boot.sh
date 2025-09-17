#!/bin/bash

echo "🔍 检查开机后服务状态..."

# 等待系统完全启动
sleep 5

# 检查PM2服务
echo "📊 PM2服务状态:"
pm2 status

# 检查端口
echo ""
echo "🌐 端口检查:"
if netstat -tuln | grep ":3001 " > /dev/null; then
    echo "✅ 后端服务: http://localhost:3001 (运行中)"
else
    echo "❌ 后端服务: 未运行"
    echo "🔄 尝试启动..."
    cd /home/yjw/Ai-1.0 && ./pm2-manage.sh start
fi

if netstat -tuln | grep ":5173 " > /dev/null; then
    echo "✅ 前端服务: http://localhost:5173 (运行中)"
else
    echo "❌ 前端服务: 未运行"
fi

echo ""
echo "🎯 如果服务未自动启动，手动执行:"
echo "cd /home/yjw/Ai-1.0 && ./pm2-manage.sh start"
