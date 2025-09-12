#!/usr/bin/env node

/**
 * Q CLI代理可行性测试
 */

const { spawn } = require('child_process');
const fs = require('fs');

console.log('🧪 开始测试Q CLI代理可行性...\n');

// 测试1：检查Q CLI是否可用
function testQCLIAvailable() {
  return new Promise((resolve) => {
    console.log('📋 测试1: 检查Q CLI是否安装...');
    
    const qProcess = spawn('q', ['--version'], { stdio: 'pipe' });
    
    let output = '';
    qProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    qProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Q CLI可用，版本:', output.trim());
        resolve(true);
      } else {
        console.log('❌ Q CLI不可用');
        resolve(false);
      }
    });
    
    qProcess.on('error', (error) => {
      console.log('❌ Q CLI未安装:', error.message);
      resolve(false);
    });
  });
}

// 测试2：检查Q CLI是否已登录
function testQCLIAuth() {
  return new Promise((resolve) => {
    console.log('\n📋 测试2: 检查Q CLI认证状态...');
    
    const qProcess = spawn('q', ['doctor'], { stdio: 'pipe' });
    
    let output = '';
    qProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    qProcess.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    qProcess.on('close', (code) => {
      if (output.includes('authenticated') || output.includes('logged in')) {
        console.log('✅ Q CLI已认证');
        resolve(true);
      } else {
        console.log('⚠️ Q CLI未认证或需要登录');
        console.log('输出:', output.trim());
        resolve(false);
      }
    });
  });
}

// 测试3：测试简单的Q CLI交互
function testQCLIInteraction() {
  return new Promise((resolve) => {
    console.log('\n📋 测试3: 测试Q CLI交互...');
    
    const qProcess = spawn('q', ['chat'], { 
      stdio: 'pipe',
      env: { ...process.env, Q_NONINTERACTIVE: 'true' }
    });
    
    let output = '';
    let hasResponse = false;
    
    qProcess.stdout.on('data', (data) => {
      output += data.toString();
      if (output.length > 10) {
        hasResponse = true;
        qProcess.kill();
      }
    });
    
    qProcess.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    // 发送测试消息
    setTimeout(() => {
      qProcess.stdin.write('hello\n');
    }, 1000);
    
    // 超时处理
    setTimeout(() => {
      if (!hasResponse) {
        qProcess.kill();
        console.log('⚠️ Q CLI交互超时');
        resolve(false);
      }
    }, 5000);
    
    qProcess.on('close', () => {
      if (hasResponse) {
        console.log('✅ Q CLI交互正常');
        console.log('响应预览:', output.substring(0, 100) + '...');
        resolve(true);
      } else {
        console.log('❌ Q CLI交互失败');
        console.log('输出:', output);
        resolve(false);
      }
    });
  });
}

// 主测试函数
async function runTests() {
  console.log('🚀 Q CLI代理可行性测试开始\n');
  
  const test1 = await testQCLIAvailable();
  if (!test1) {
    console.log('\n❌ 测试失败：Q CLI不可用');
    console.log('💡 解决方案：需要安装Q CLI');
    return false;
  }
  
  const test2 = await testQCLIAuth();
  if (!test2) {
    console.log('\n⚠️ 警告：Q CLI未认证');
    console.log('💡 需要执行：q login');
  }
  
  const test3 = await testQCLIInteraction();
  
  console.log('\n📊 测试结果汇总:');
  console.log(`Q CLI安装: ${test1 ? '✅' : '❌'}`);
  console.log(`Q CLI认证: ${test2 ? '✅' : '⚠️'}`);
  console.log(`Q CLI交互: ${test3 ? '✅' : '❌'}`);
  
  const canProceed = test1 && (test2 || test3);
  
  if (canProceed) {
    console.log('\n🎉 Q CLI代理方案可行！');
    console.log('📝 下一步：创建代理服务');
  } else {
    console.log('\n❌ Q CLI代理方案不可行');
    console.log('💡 建议：使用模拟Q CLI或其他方案');
  }
  
  return canProceed;
}

// 运行测试
runTests().catch(console.error);
