// API配置 - 本地开发模式
const isDevelopment = import.meta.env.DEV;

// 本地后端地址
const LOCAL_BACKEND_URL = 'http://localhost:3001';

export const API_BASE_URL = LOCAL_BACKEND_URL;

console.log('🔧 API配置:', {
  isDevelopment,
  API_BASE_URL,
  mode: '本地模式',
  currentHost: window.location.host
});
