// API配置
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:3001' 
  : ''; // Vercel中使用相对路径

export const API_ENDPOINTS = {
  memories: `${API_BASE_URL}/api/memories`,
  qChat: `${API_BASE_URL}/api/q-chat`,
  qStatus: `${API_BASE_URL}/api/q-status`,
  instructions: `${API_BASE_URL}/api/instructions`,
  laoziSession: `${API_BASE_URL}/api/laozi-session`
};

console.log('🔧 API配置:', {
  isDevelopment,
  isProduction,
  API_BASE_URL,
  currentHost: window.location.host
});
