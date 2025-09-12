#!/usr/bin/env node

/**
 * Q CLI代理可行性测试
 */

const { spawn } = require('child_process');

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

// 主测试函数
async function runTests() {
  console.log('🚀 Q CLI代理可行性测试开始\n');
  
  const test1 = await testQCLIAvailable();
  if (!test1) {
    console.log('\n❌ 测试失败：Q CLI不可用');
    console.log('💡 这是正常的，因为当前环境没有Q CLI');
    console.log('📝 解决方案：使用模拟Q CLI或在部署时安装');
    return false;
  }
  
  const test2 = await testQCLIAuth();
  
  console.log('\n📊 测试结果汇总:');
  console.log(`Q CLI安装: ${test1 ? '✅' : '❌'}`);
  console.log(`Q CLI认证: ${test2 ? '✅' : '⚠️'}`);
  
  console.log('\n🎯 结论：');
  if (test1) {
    console.log('✅ Q CLI代理方案可行！');
  } else {
    console.log('📝 当前环境无Q CLI，但部署时可以安装');
    console.log('💡 建议：创建Docker镜像包含Q CLI');
  }
  
  return true; // 方案依然可行，只是需要在部署环境安装Q CLI
}

// 运行测试
runTests().catch(console.error);
