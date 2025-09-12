// API配置 - 支持Railway部署
const isDevelopment = import.meta.env.DEV;

// Railway后端地址（部署后需要更新）
const RAILWAY_BACKEND_URL = 'https://your-app.railway.app';

export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:3001' 
  : RAILWAY_BACKEND_URL;

console.log('🔧 API配置:', {
  isDevelopment,
  API_BASE_URL,
  currentHost: window.location.host
});
