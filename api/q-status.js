// Q CLI状态检查API
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只支持GET方法' });
  }

  // 模拟Q CLI状态
  return res.status(200).json({
    status: 'available',
    version: '1.0.0-demo',
    authenticated: true,
    message: '演示模式：Q CLI功能正常'
  });
}
