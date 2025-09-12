import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const memoriesDir = path.join(__dirname, '个人记忆');

// 健康检查
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Q CLI对话接口 - 简化版
app.post('/api/chat-with-q', async (req, res) => {
  console.log('🔵 Q CLI请求:', req.body);
  
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: '消息不能为空' });
    }

    // 简单的Q CLI调用
    const response = await new Promise((resolve, reject) => {
      const child = spawn('q', ['chat', '--no-interactive', message], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        resolve({ stdout, stderr, code });
      });
      
      child.on('error', (error) => {
        reject(error);
      });
      
      // 30秒超时
      setTimeout(() => {
        child.kill();
        reject(new Error('超时'));
      }, 30000);
    });
    
    // 清理输出
    const cleanedResponse = response.stdout
      .replace(/\x1b\[[0-9;]*m/g, '')
      .trim();
    
    res.json({
      success: true,
      response: cleanedResponse || '收到您的消息，Q CLI正在处理中...',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.log('❌ Q CLI错误:', error.message);
    res.status(500).json({
      error: 'Q CLI不可用',
      suggestion: '请确保已安装并配置Q CLI'
    });
  }
});

// 记忆库API
app.get('/api/memories', async (req, res) => {
  try {
    const files = await fs.promises.readdir(memoriesDir);
    const mdFiles = files.filter(file => file.endsWith('.md'));
    
    const memories = [];
    
    for (const filename of mdFiles) {
      try {
        const filePath = path.join(memoriesDir, filename);
        const content = await fs.promises.readFile(filePath, 'utf-8');
        
        const title = content.match(/^# (.+)$/m)?.[1] || filename.replace('.md', '');
        const category = content.match(/category: (.+)$/m)?.[1] || '未分类';
        
        memories.push({
          id: filename,
          title,
          content,
          category,
          timestamp: Date.now(),
          filename,
          sourceFile: filename
        });
      } catch (error) {
        console.log(`读取文件 ${filename} 失败:`, error.message);
      }
    }
    
    res.json(memories);
  } catch (error) {
    console.log('读取记忆目录失败:', error.message);
    res.status(500).json({ error: '读取记忆失败' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 简化版API服务器运行在 http://localhost:${PORT}`);
});
