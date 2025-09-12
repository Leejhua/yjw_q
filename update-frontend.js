#!/usr/bin/env node

/**
 * 更新前端配置脚本
 * 用法: node update-frontend.js https://your-tunnel-url.trycloudflare.com
 */

const fs = require('fs');
const path = require('path');

const tunnelUrl = process.argv[2];

if (!tunnelUrl) {
  console.log('❌ 请提供 Cloudflare Tunnel URL');
  console.log('用法: node update-frontend.js https://your-tunnel-url.trycloudflare.com');
  process.exit(1);
}

// 更新前端配置
const configPath = path.join(__dirname, 'src', 'config.js');

const newConfig = `// API配置 - Cloudflare Tunnel
const isDevelopment = import.meta.env.DEV;

// Cloudflare Tunnel 后端地址
const TUNNEL_BACKEND_URL = '${tunnelUrl}';

export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:3001' 
  : TUNNEL_BACKEND_URL;

console.log('🔧 API配置:', {
  isDevelopment,
  API_BASE_URL,
  currentHost: window.location.host
});`;

fs.writeFileSync(configPath, newConfig);

console.log('✅ 前端配置已更新');
console.log('🌐 后端地址:', tunnelUrl);
console.log('📝 请提交并推送到 GitHub:');
console.log('   git add src/config.js');
console.log('   git commit -m "feat: 更新Cloudflare Tunnel后端地址"');
console.log('   git push origin master');
console.log('🚀 Vercel 会自动重新部署前端');
