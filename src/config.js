// API配置 - Cloudflare Tunnel
const isDevelopment = import.meta.env.DEV;

// Cloudflare Tunnel 后端地址
const TUNNEL_BACKEND_URL = 'https://sword-capital-according-gathered.trycloudflare.com';

export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:3001' 
  : TUNNEL_BACKEND_URL;

console.log('🔧 API配置:', {
  isDevelopment,
  API_BASE_URL,
  currentHost: window.location.host
});
