# Dokploy 部署指南

## 1. 准备文件
确保以下文件存在：
- `docker-compose.dokploy.yml`
- `Dockerfile.q-base`
- `server.js`
- `package.json`

## 2. Dokploy 部署步骤

### 方法1：Git 仓库部署
1. 在 Dokploy 中创建新应用
2. 选择 "Docker Compose" 类型
3. 连接你的 Git 仓库
4. 设置 Compose 文件路径：`docker-compose.dokploy.yml`
5. 点击部署

### 方法2：直接上传
1. 将项目文件打包上传到 Dokploy
2. 选择 Docker Compose 部署
3. 指定 compose 文件

## 3. 环境变量（可选）
在 Dokploy 中设置：
- `NODE_ENV=production`
- `Q_LOG_LEVEL=info`
- `PORT=3001`

## 4. 域名配置
在 Dokploy 中配置域名指向端口 3001

## 5. 验证部署
访问：`https://你的域名/health`
应该返回：`{"status":"ok",...}`
