const express = require('express');
const path = require('path');
const app = express();

// CORS设置
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// 静态文件服务
app.use(express.static('.'));
app.use('/src', express.static('./src'));

// SPA路由
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(5173, '0.0.0.0', () => {
  console.log('前端服务器运行在 http://localhost:5173');
});
