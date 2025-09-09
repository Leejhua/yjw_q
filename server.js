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

// 记忆缓存
let memoriesCache = null;
let lastCacheTime = 0;
const CACHE_DURATION = 30000; // 30秒缓存

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
    .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')
    // 移除方括号中的数字序列
    .replace(/\[[0-9;]*[mGKH]/g, '')
    // 移除其他常见的ANSI残留
    .replace(/\[0m/g, '')
    .replace(/\[39m/g, '')
    .replace(/\[38;5;\d+m/g, '')
    // 移除特殊字符
    .replace(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/g, '')
    // 移除提示符
    .replace(/^>\s*/gm, '')
    // 清理多余空白
    .replace(/\s+/g, ' ')
    .replace(/^\s+|\s+$/g, '')
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
  console.log('🔍 开始检查Q CLI可用性...');
  
  return new Promise((resolve) => {
    const startTime = Date.now();
    const testProcess = spawn('q', ['--help'], { 
      stdio: 'pipe',
      shell: true
    });
    
    let hasOutput = false;
    let outputData = '';
    
    testProcess.stdout.on('data', (data) => {
      hasOutput = true;
      outputData += data.toString();
      console.log('📤 Q CLI测试输出:', data.toString().substring(0, 100));
    });
    
    testProcess.stderr.on('data', (data) => {
      console.log('⚠️  Q CLI测试错误输出:', data.toString());
    });
    
    testProcess.on('exit', (code) => {
      const duration = Date.now() - startTime;
      console.log(`🏁 Q CLI测试进程退出，代码: ${code}, 耗时: ${duration}ms, 有输出: ${hasOutput}`);
      resolve(code === 0 && hasOutput);
    });
    
    testProcess.on('error', (error) => {
      const duration = Date.now() - startTime;
      console.log('❌ Q CLI测试错误:', error.message, `耗时: ${duration}ms`);
      resolve(false);
    });
    
    // 5秒超时
    setTimeout(() => {
      console.log('⏰ Q CLI测试超时，强制结束');
      testProcess.kill();
      resolve(false);
    }, 5000);
  });
}

// 提取Q CLI实际回复内容
function extractQResponse(rawOutput) {
  console.log('🔧 开始提取Q CLI回复内容...');
  console.log('📥 原始输入长度:', rawOutput.length);
  
  // 温和清理，主要移除格式代码但保留内容
  let cleanOutput = rawOutput
    // 移除所有ANSI转义序列（更全面）
    .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\x1B\[[0-9;]*m/g, '')
    .replace(/\x1B\[[\d;]*[HfABCDsuJKmhlp]/g, '')
    .replace(/\x1B\[[\d;]*[a-zA-Z]/g, '')
    .replace(/\x1B[@-_]/g, '')
    .replace(/\x1B\]/g, '')
    // 移除控制字符但保留换行和空格
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    // 移除工具调用的装饰符号和加载动画
    .replace(/🛠️\s*/g, '')
    .replace(/[⋮●✓↳⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏⢀⢠⢰⢸⢹⢺⢻⣀⣄⣆⣇⣧⣷⣿]/g, '')
    .replace(/\(trusted\)/g, '')
    // 清理提示符
    .replace(/^>\s*/gm, '')
    // 规范化空白字符
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
  
  console.log('🧹 清理后长度:', cleanOutput.length);
  console.log('🧹 清理后内容预览:', cleanOutput.substring(0, 300));
  
  if (cleanOutput && cleanOutput.length > 5) {
    console.log('✅ 提取成功');
    return cleanOutput;
  }
  
  console.log('❌ 提取失败，返回原始内容');
  return rawOutput.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '').trim();
}

// API端点：Q CLI对话 - 增强版本
app.post('/api/chat-with-q', async (req, res) => {
  const startTime = Date.now();
  console.log(`\n🔵 [${new Date().toISOString()}] Q CLI增强请求开始`);
  console.log(`📝 请求内容:`, JSON.stringify(req.body));
  
  try {
    const { message, sessionId = 'default', memories = [] } = req.body;
    
    if (!message) {
      console.log('❌ 错误: 消息为空');
      return res.status(400).json({ error: '消息不能为空' });
    }

    console.log(`💬 用户消息: "${message}"`);
    console.log(`🔑 会话ID: ${sessionId}`);
    console.log(`🧠 传入记忆数量: ${memories.length}`);

    // 检查Q CLI是否可用
    console.log('🔍 检查Q CLI可用性...');
    const isAvailable = await checkQCliAvailable();
    console.log(`✅ Q CLI可用性: ${isAvailable}`);
    
    if (!isAvailable) {
      console.log('❌ Q CLI不可用');
      return res.status(503).json({ 
        error: 'Q CLI不可用',
        suggestion: '请确保已安装并配置Q CLI'
      });
    }

    // 构建增强的提示词，包含记忆上下文
    let enhancedPrompt = message;
    
    if (memories.length > 0) {
      console.log('🧠 添加记忆上下文到提示词');
      const memoryContext = memories.map(mem => 
        `[记忆: ${mem.title}]\n${mem.content}`
      ).join('\n\n');
      
      enhancedPrompt = `基于以下个人记忆信息回答问题：

${memoryContext}

用户问题: ${message}

请结合上述记忆信息给出个性化的回答。如果需要更新或保存新的记忆信息，请使用你的内置工具操作 /home/yjw/ai-/个人记忆 文件夹中的相关文件。`;
    }

    console.log('🚀 开始执行增强Q CLI命令...');
    const response = await new Promise((resolve, reject) => {
      // 使用正确的Q CLI命令格式，添加trust-all-tools
      const command = `q chat --no-interactive --trust-all-tools "${enhancedPrompt.replace(/"/g, '\\"')}"`;
      console.log(`📋 执行命令长度: ${command.length} 字符`);
      
      exec(command, {
        timeout: 60000, // 增加到60秒
        cwd: '/home/yjw/ai-', // 设置工作目录
        maxBuffer: 1024 * 1024 * 10, // 增加输出缓冲区到10MB
        env: { 
          ...process.env, 
          NO_COLOR: '1', 
          TERM: 'dumb',
          FORCE_COLOR: '0',
          CI: '1'
        }
      }, (error, stdout, stderr) => {
        console.log(`⏱️  命令执行完成，耗时: ${Date.now() - startTime}ms`);
        
        if (error && !stdout) {
          console.error('❌ Q CLI执行错误:', error);
          console.error('❌ stderr:', stderr);
          resolve('Q CLI执行失败: ' + error.message);
          return;
        }
        
        console.log('📤 Q CLI原始输出长度:', stdout.length);
        console.log('📤 Q CLI完整输出:', stdout); // 输出完整内容而不是截断
        
        if (stderr) {
          console.log('⚠️  stderr输出:', stderr.substring(0, 500));
        }
        
        // 等待一下确保文件操作完成
        setTimeout(() => {
          // 彻底清理输出
          let cleanOutput = stdout
            // 移除所有ANSI转义序列（更全面的正则）
            .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')
            .replace(/\x1B\[[0-9;]*m/g, '')
            .replace(/\x1B\[[\d;]*[HfABCDsuJKmhlp]/g, '')
            .replace(/\x1B\[[\d;]*[a-zA-Z]/g, '')
            // 移除其他转义序列
            .replace(/\x1B[@-_]/g, '')
            .replace(/\x1B\]/g, '')
            // 移除控制字符
            .replace(/[\x00-\x08\x0B-\x1F\x7F-\x9F]/g, '')
            // 移除加载动画字符
            .replace(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏⢀⢠⢰⢸⢹⢺⢻⣀⣄⣆⣇⣧⣷⣿]/g, '')
            // 移除特殊符号
            .replace(/[⋮●✓]/g, '')
            // 移除多余空白和换行
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n')
            .trim();
          
          console.log('🧹 清理后输出长度:', cleanOutput.length);
          console.log('🧹 清理后输出:', cleanOutput.substring(0, 500) + '...');
          
          // 提取实际回复内容
          const actualResponse = extractQResponse(cleanOutput);
          
          console.log('✨ 最终回复长度:', actualResponse.length);
          console.log('✨ 最终回复:', actualResponse.substring(0, 200) + '...');
          
          resolve(actualResponse || '抱歉，Q CLI没有返回有效回复');
        }, 1000); // 等待1秒确保文件操作完成
      });
    });

    console.log(`🎉 Q CLI响应成功，总耗时: ${Date.now() - startTime}ms`);
    
    // 如果响应成功，尝试保存对话历史并刷新记忆缓存
    if (response && response.length > 50) {
      console.log('💾 尝试保存对话历史到Q CLI...');
      try {
        const saveCommand = `q chat --no-interactive "/save conversation-${new Date().toISOString().split('T')[0]}"`;
        exec(saveCommand, { timeout: 5000, cwd: '/home/yjw/ai-' }, (err, out) => {
          if (err) {
            console.log('⚠️  保存对话历史失败:', err.message);
          } else {
            console.log('✅ 对话历史已保存');
          }
        });
      } catch (saveError) {
        console.log('⚠️  保存对话历史异常:', saveError.message);
      }
      
      // 检查是否包含文件操作，如果是则清除记忆缓存
      if (response.includes('fs_write') || response.includes('Using tool: fs_write')) {
        console.log('🔄 检测到文件写操作，清除记忆缓存以强制重新加载');
        memoriesCache = null; // 清除缓存
        lastCacheTime = 0;
      }
    }
    
    res.json({
      success: true,
      response: response,
      sessionId: sessionId,
      debug: {
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        messageLength: message.length,
        responseLength: response.length,
        memoriesUsed: memories.length
      }
    });

  } catch (error) {
    console.error('❌ Q CLI对话错误:', error);
    console.error('❌ 错误堆栈:', error.stack);
    res.status(500).json({ 
      error: 'Q CLI对话失败',
      details: error.message,
      debug: {
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      }
    });
  }
});

// API端点：检查Q CLI状态
app.get('/api/q-status', async (req, res) => {
  console.log(`\n🔍 [${new Date().toISOString()}] 检查Q CLI状态请求`);
  
  try {
    const startTime = Date.now();
    console.log('🔄 开始检查Q CLI可用性...');
    
    const isAvailable = await checkQCliAvailable();
    const duration = Date.now() - startTime;
    
    console.log(`✅ Q CLI状态检查完成: ${isAvailable}, 耗时: ${duration}ms`);
    console.log(`📊 当前会话数: ${qSessions.size}`);
    
    res.json({
      available: isAvailable,
      sessions: qSessions.size,
      debug: {
        timestamp: new Date().toISOString(),
        checkDuration: duration
      }
    });
  } catch (error) {
    console.error('❌ 检查Q CLI状态失败:', error);
    res.json({
      available: false,
      error: error.message,
      debug: {
        timestamp: new Date().toISOString(),
        error: error.message
      }
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

// API端点：强制刷新记忆缓存
app.post('/api/memories/refresh', (req, res) => {
  console.log('🔄 强制刷新记忆缓存');
  memoriesCache = null;
  lastCacheTime = 0;
  res.json({ success: true, message: '记忆缓存已清除' });
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
// 静态文件服务
app.use(express.static('.'));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

