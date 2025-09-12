// 更新前端配置，使用本地后端 API
const fs = require('fs');
const path = require('path');

// 读取前端文件
const frontendFiles = ['src/main.js', 'src/App.vue', 'index.html'];

frontendFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // 替换 API 地址为你的 Cloudflare Tunnel 域名
    content = content.replace(
      /http:\/\/localhost:3001/g, 
      'https://api.example.com'  // 替换为你的实际域名
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ 已更新 ${file}`);
  }
});

console.log('🎉 前端配置已更新为使用远程后端 API');
