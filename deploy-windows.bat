@echo off
echo 🚀 开始部署AI助手后端...

REM 构建Docker镜像
echo 📦 构建Docker镜像...
docker build -t ai-assistant-backend .

REM 停止旧容器（如果存在）
echo 🛑 停止旧容器...
docker stop ai-assistant-backend 2>nul
docker rm ai-assistant-backend 2>nul

REM 启动新容器
echo 🚀 启动后端服务...
docker run -d ^
  --name ai-assistant-backend ^
  -p 3001:3001 ^
  -v %USERPROFILE%\.aws:/home/quser/.aws ^
  -v %cd%:/home/quser/workspace ^
  ai-assistant-backend

echo ✅ 后端部署完成！
echo 🌐 后端地址: http://localhost:3001
echo 📱 前端地址: https://ai-1-0-rust.vercel.app

pause
