#!/usr/bin/env node

// 更新后端URL脚本
const fs = require('fs');
const path = require('path');

const railwayUrl = process.argv[2];

if (!railwayUrl) {
  console.log('❌ 请提供Railway后端地址');
  console.log('用法: node update-backend-url.js https://your-app.railway.app');
  process.exit(1);
}

const configPath = path.join(__dirname, 'src', 'config.js');
let config = fs.readFileSync(configPath, 'utf8');

config = config.replace(
  /const RAILWAY_BACKEND_URL = '.*';/,
  `const RAILWAY_BACKEND_URL = '${railwayUrl}';`
);

fs.writeFileSync(configPath, config);

console.log('✅ 后端地址已更新:', railwayUrl);
console.log('📝 请提交并推送到GitHub，Vercel会自动重新部署前端');
