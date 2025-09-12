// Vercel Serverless Function for memories API
const fs = require('fs');
const path = require('path');

// 模拟记忆数据（因为Vercel无法持久化文件）
let mockMemories = [
  {
    id: '1',
    title: '演示记忆1',
    category: '个人信息',
    content: '这是一个演示记忆，展示记忆库功能',
    timestamp: new Date().toISOString(),
    filename: 'demo1.json'
  },
  {
    id: '2', 
    title: '演示记忆2',
    category: '人生规划',
    content: '这是另一个演示记忆，展示编辑功能',
    timestamp: new Date().toISOString(),
    filename: 'demo2.json'
  }
];

export default function handler(req, res) {
  // 设置CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method, query } = req;

  try {
    switch (method) {
      case 'GET':
        // 获取所有记忆
        return res.status(200).json(mockMemories);

      case 'POST':
        // 创建新记忆
        const newMemory = {
          id: Date.now().toString(),
          ...req.body,
          timestamp: new Date().toISOString(),
          filename: `memory-${Date.now()}.json`
        };
        mockMemories.push(newMemory);
        return res.status(201).json(newMemory);

      case 'PUT':
        // 更新记忆
        const { filename } = query;
        const memoryIndex = mockMemories.findIndex(m => m.filename === filename);
        
        if (memoryIndex === -1) {
          return res.status(404).json({ error: '记忆不存在' });
        }
        
        mockMemories[memoryIndex] = {
          ...mockMemories[memoryIndex],
          ...req.body,
          timestamp: new Date().toISOString()
        };
        
        return res.status(200).json({ 
          success: true, 
          data: mockMemories[memoryIndex] 
        });

      case 'DELETE':
        // 删除记忆
        const deleteFilename = query.filename;
        const deleteIndex = mockMemories.findIndex(m => m.filename === deleteFilename);
        
        if (deleteIndex === -1) {
          return res.status(404).json({ error: '记忆不存在' });
        }
        
        mockMemories.splice(deleteIndex, 1);
        return res.status(200).json({ success: true });

      default:
        return res.status(405).json({ error: '方法不允许' });
    }
  } catch (error) {
    console.error('API错误:', error);
    return res.status(500).json({ error: error.message });
  }
}
