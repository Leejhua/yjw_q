// 简单的Q CLI测试
const { spawn } = require('child_process');

async function testQCLI(message) {
  return new Promise((resolve, reject) => {
    const child = spawn('q', ['chat', '--no-interactive', message], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000
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
      console.log('Q CLI 输出:', stdout.substring(0, 200));
      resolve({ stdout, stderr, code });
    });
    
    child.on('error', (error) => {
      console.log('Q CLI 错误:', error.message);
      reject(error);
    });
  });
}

testQCLI('你好，请简单介绍一下自己').then(result => {
  console.log('测试完成');
}).catch(err => {
  console.log('测试失败:', err.message);
});
