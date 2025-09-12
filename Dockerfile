# 使用老板提供的Q CLI基础镜像
FROM ghcr.io/你的用户名/q:latest

# 切换到工作目录
WORKDIR /home/quser/workspace

# 复制项目文件
COPY package*.json ./
COPY server.js ./
COPY 个人记忆/ ./个人记忆/

# 安装Node.js依赖
RUN npm install

# 暴露端口
EXPOSE 3001

# 启动后端服务
CMD ["node", "server.js"]
