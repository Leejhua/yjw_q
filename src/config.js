// API配置
const isDevelopment = import.meta.env.DEV;

// 后端地址配置
const LOCAL_BACKEND_URL = 'http://localhost:3001';
const PRODUCTION_BACKEND_URL = 'https://oclc-alice-supporting-mega.trycloudflare.com';

// 自动选择后端地址
export const API_BASE_URL = isDevelopment ? LOCAL_BACKEND_URL : PRODUCTION_BACKEND_URL;

console.log('🔧 API配置:', {
  isDevelopment,
  API_BASE_URL,
  mode: isDevelopment ? '本地模式' : '生产模式',
  currentHost: window.location.host
});
