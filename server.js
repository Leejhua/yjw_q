import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { spawn, exec } from 'child_process';

const app = express();
const PORT = 3001;

// 获取当前目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 配置multer用于文件上传
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB限制
});

// 确保个人记忆文件夹存在
const memoriesDir = path.join(__dirname, '个人记忆');
if (!fs.existsSync(memoriesDir)) {
  fs.mkdirSync(memoriesDir, { recursive: true });
}

// Q CLI 会话管理
const qSessions = new Map();
const SESSION_TIMEOUT = 10 * 60 * 1000; // 10分钟超时

// 清理过期会话
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of qSessions.entries()) {
    if (now - session.lastUsed > SESSION_TIMEOUT) {
      if (session.process && !session.process.killed) {
        session.process.kill();
      }
      qSessions.delete(sessionId);
      console.log(`🧹 清理过期Q CLI会话: ${sessionId}`);
    }
  }
}, 60000); // 每分钟检查一次

// 清理ANSI颜色代码 - 更彻底的方法
function cleanAnsiCodes(text) {
  // 移除所有可能的ANSI序列
  return text
    // 移除所有ESC序列
    .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '')
    // 移除剩余的控制字符
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    // 移除方括号中的数字序列
    .replace(/\[[0-9;]*[mGKH]/g, '')
    // 移除其他常见的ANSI残留
    .replace(/\[0m/g, '')
    .replace(/\[39m/g, '')
    .replace(/\[38;5;\d+m/g, '')
    // 清理多余空白
    .replace(/\s+/g, ' ')
    .trim();
}

// 创建或获取Q CLI会话
function getQSession(sessionId) {
  if (qSessions.has(sessionId)) {
    const session = qSessions.get(sessionId);
    session.lastUsed = Date.now();
    return session;
  }

  // 创建新的Q CLI进程
  const qProcess = spawn('q', ['chat'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
    env: { ...process.env, NO_COLOR: '1' } // 禁用颜色输出
  });

  const session = {
    process: qProcess,
    lastUsed: Date.now(),
    buffer: '',
    isReady: false
  };

  // 处理输出
  qProcess.stdout.on('data', (data) => {
    const cleanData = cleanAnsiCodes(data.toString());
    session.buffer += cleanData;
  });

  qProcess.stderr.on('data', (data) => {
    console.error(`Q CLI错误: ${data}`);
  });

  qProcess.on('exit', (code) => {
    console.log(`Q CLI进程退出，代码: ${code}`);
    qSessions.delete(sessionId);
  });

  qSessions.set(sessionId, session);
  console.log(`🚀 创建新的Q CLI会话: ${sessionId}`);
  
  return session;
}

// 检查Q CLI是否可用
async function checkQCliAvailable() {
  return new Promise((resolve) => {
    const testProcess = spawn('q', ['--help'], { 
      stdio: 'pipe',
      shell: true  // 添加shell选项
    });
    
    let hasOutput = false;
    
    testProcess.stdout.on('data', (data) => {
      hasOutput = true;
    });
    
    testProcess.on('exit', (code) => {
      resolve(code === 0 && hasOutput);
    });
    
    testProcess.on('error', (error) => {
      console.log('Q CLI检查错误:', error.message);
      resolve(false);
    });
    
    // 5秒超时
    setTimeout(() => {
      testProcess.kill();
      resolve(false);
    }, 5000);
  });
}

// API端点：Q CLI对话
app.post('/api/chat-with-q', async (req, res) => {
  try {
    const { message, sessionId = 'default' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: '消息不能为空' });
    }

    // 检查Q CLI是否可用
    const isAvailable = await checkQCliAvailable();
    if (!isAvailable) {
      return res.status(503).json({ 
        error: 'Q CLI不可用',
        suggestion: '请确保已安装并配置Q CLI'
      });
    }

    // 使用简单的一次性命令方式
    const response = await new Promise((resolve, reject) => {
      // 直接执行命令，将消息作为参数传递
      const command = `echo "${message.replace(/"/g, '\\"')}" | q chat`;
      
      exec(command, {
        timeout: 10000,
        env: { ...process.env, NO_COLOR: '1', TERM: 'dumb' }
      }, (error, stdout, stderr) => {
        if (error) {
          console.error('Q CLI执行错误:', error);
          resolve('Q CLI执行失败: ' + error.message);
          return;
        }
        
        if (stderr) {
          console.error('Q CLI stderr:', stderr);
        }
        
        console.log('Q CLI原始输出:', stdout);
        
        // 清理输出
        let cleanOutput = stdout
          .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '') // 移除ANSI
          .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // 移除控制字符
          .trim();
        
        console.log('Q CLI清理后:', cleanOutput);
        
        resolve(cleanOutput || 'Q CLI无回复');
      });
    });

    res.json({
      success: true,
      response: response,
      sessionId: sessionId
    });

  } catch (error) {
    console.error('Q CLI对话错误:', error);
    res.status(500).json({ 
      error: 'Q CLI对话失败',
      details: error.message 
    });
  }
});

// API端点：检查Q CLI状态
app.get('/api/q-status', async (req, res) => {
  try {
    const isAvailable = await checkQCliAvailable();
    res.json({
      available: isAvailable,
      sessions: qSessions.size
    });
  } catch (error) {
    res.json({
      available: false,
      error: error.message
    });
  }
});

// API端点：保存记忆文件
app.post('/api/save-memory', async (req, res) => {
  try {
    const { filename, content } = req.body;
    
    if (!filename || !content) {
      return res.status(400).json({ error: '文件名和内容不能为空' });
    }
    
    const safeFilename = filename.replace(/[^a-zA-Z0-9\u4e00-\u9fa5.-]/g, '_');
    const filePath = path.join(memoriesDir, safeFilename);
    
    await fs.promises.writeFile(filePath, content, 'utf-8');
    
    res.json({ 
      success: true, 
      path: filePath,
      filename: safeFilename,
      message: `文件 ${safeFilename} 已保存到个人记忆文件夹`
    });
  } catch (error) {
    console.error('保存文件失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// API端点：读取所有记忆文件
app.get('/api/memories', async (req, res) => {
  try {
    const files = await fs.promises.readdir(memoriesDir);
    const mdFiles = files.filter(file => file.endsWith('.md'));
    
    const memories = [];
    
    for (const filename of mdFiles) {
      try {
        const filePath = path.join(memoriesDir, filename);
        const content = await fs.promises.readFile(filePath, 'utf-8');
        
        // 解析标题和类别
        const lines = content.split('\n');
        const title = lines.find(line => line.startsWith('# '))?.replace('# ', '') || 
                     filename.replace('.md', '');
        
        let category = '个人记忆';
        if (filename.includes('基本信息')) category = '个人信息';
        else if (filename.includes('愿景')) category = '人生规划';
        else if (filename.includes('价值观')) category = '个人价值';
        else if (filename.includes('成就')) category = '个人成就';
        else if (filename.includes('时间线')) category = '人生历程';
        else if (filename.includes('习惯')) category = '生活习惯';
        else if (filename.includes('人际关系')) category = '人际关系';
        else if (filename.includes('家庭')) category = '家庭关系';
        else if (filename.includes('愿望')) category = '个人愿望';
        else if (filename.includes('快照')) category = '个人资料';
        
        memories.push({
          id: filename,
          title,
          content,
          category,
          timestamp: (await fs.promises.stat(filePath)).mtime.getTime(),
          filename,
          sourceFile: filename
        });
      } catch (error) {
        console.error(`读取文件 ${filename} 失败:`, error);
      }
    }
    
    res.json(memories);
  } catch (error) {
    console.error('读取记忆失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// API端点：更新记忆文件
app.put('/api/memories/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const { title, content, category, tags } = req.body;
    
    if (!filename || !content) {
      return res.status(400).json({ error: '文件名和内容不能为空' });
    }
    
    const filePath = path.join(memoriesDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    // 构建更新后的内容
    let updatedContent = content;
    
    // 如果标题变更，更新文件中的标题
    if (title) {
      const lines = content.split('\n');
      const hasTitleLine = lines.some(line => line.startsWith('# '));
      
      if (hasTitleLine) {
        // 更新现有标题
        updatedContent = lines.map(line => 
          line.startsWith('# ') ? `# ${title}` : line
        ).join('\n');
      } else {
        // 添加标题到文件开头
        updatedContent = `# ${title}\n\n${content}`;
      }
    }
    
    // 写入更新后的内容
    await fs.promises.writeFile(filePath, updatedContent, 'utf-8');
    
    res.json({ 
      success: true, 
      path: filePath,
      filename: filename,
      message: `文件 ${filename} 已更新`
    });
  } catch (error) {
    console.error('更新文件失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// API端点：删除记忆文件
app.delete('/api/memories/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(memoriesDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    await fs.promises.unlink(filePath);
    res.json({ success: true, message: `文件 ${filename} 已删除` });
  } catch (error) {
    console.error('删除文件失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 启动服务器
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 记忆存储服务器运行在 http://localhost:${PORT}`);
  console.log(`📁 记忆文件夹: ${memoriesDir}`);
});

// 处理端口占用错误
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.log(`端口 ${PORT} 被占用，尝试使用端口 ${PORT + 1}`);
    app.listen(PORT + 1, '0.0.0.0', () => {
      console.log(`🚀 记忆存储服务器运行在 http://localhost:${PORT + 1}`);
      console.log(`📁 记忆文件夹: ${memoriesDir}`);
    });
  } else {
    console.error('服务器启动失败:', error);
  }
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('服务器正在关闭...');
  process.exit(0);
});