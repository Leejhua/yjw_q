// API配置 - 支持GitHub Codespaces部署
const isDevelopment = import.meta.env.DEV;

// GitHub Codespaces后端地址
const CODESPACES_BACKEND_URL = 'https://ideal-succotash-g4pg7xxpp77rhp7g9-3001.app.github.dev';

export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:3001' 
  : CODESPACES_BACKEND_URL;

console.log('🔧 API配置:', {
  isDevelopment,
  API_BASE_URL,
  currentHost: window.location.host
});
