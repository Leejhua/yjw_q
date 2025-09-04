import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { fileURLToPath } from 'url';

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