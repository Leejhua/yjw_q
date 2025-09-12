import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';

const app = express();

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// POST /chat 接口
app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: '消息不能为空' });
    }
    
    // 调用本地 q CLI
    const qProcess = spawn('q', ['chat', '--message', message], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      timeout: 25000 // Vercel 30秒限制，留5秒缓冲
    });
    
    let stdout = '';
    let stderr = '';
    
    qProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    qProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    qProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Q CLI 错误:', stderr);
        return res.status(500).json({ error: `Q CLI 执行失败: ${stderr}` });
      }
      
      // 清理输出中的 ANSI 颜色代码
      const cleanOutput = stdout.replace(/\x1b\[[0-9;]*m/g, '').trim();
      
      res.json({ reply: cleanOutput });
    });
    
    qProcess.on('error', (error) => {
      console.error('Q CLI 进程错误:', error);
      res.status(500).json({ error: `无法启动 Q CLI: ${error.message}` });
    });
    
  } catch (error) {
    console.error('处理 /chat 请求时出错:', error);
    res.status(500).json({ error: error.message });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 根路径
app.get('/', (req, res) => {
  res.json({ message: 'AI Chat API', version: '1.0.0' });
});

export default app;
