// Vercel Serverless Function for Q CLI proxy
export default function handler(req, res) {
  // 设置CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持POST方法' });
  }

  const { message, sessionId } = req.body;

  try {
    // 模拟Q CLI响应（因为Vercel环境限制，无法运行真实Q CLI）
    const mockResponses = [
      "我是Amazon Q，很高兴为您服务！这是一个演示环境。",
      "在真实部署中，我会连接到完整的Q CLI服务。",
      "您可以体验记忆库的完整功能，包括创建、编辑和删除记忆。",
      "如需完整的Q CLI功能，请在本地环境或支持Q CLI的服务器上部署。"
    ];

    const response = mockResponses[Math.floor(Math.random() * mockResponses.length)];

    return res.status(200).json({
      success: true,
      response: response,
      sessionId: sessionId || 'demo-session',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Q Chat API错误:', error);
    return res.status(500).json({ 
      error: '服务暂时不可用',
      message: error.message 
    });
  }
}
