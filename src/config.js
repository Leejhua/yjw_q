// API配置 - 支持Render部署
const isDevelopment = import.meta.env.DEV;

// Render后端地址（部署后需要更新）
const RENDER_BACKEND_URL = 'https://your-app.onrender.com';

export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:3001' 
  : RENDER_BACKEND_URL;

console.log('🔧 API配置:', {
  isDevelopment,
  API_BASE_URL,
  currentHost: window.location.host
});
