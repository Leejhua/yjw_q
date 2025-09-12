// 指令API
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

  // 模拟指令数据
  const mockInstructions = [
    {
      id: '1',
      title: '演示指令1',
      description: '这是一个演示指令',
      command: 'echo "Hello World"',
      category: 'demo'
    },
    {
      id: '2',
      title: '演示指令2', 
      description: '另一个演示指令',
      command: 'ls -la',
      category: 'demo'
    }
  ];

  return res.status(200).json(mockInstructions);
}
