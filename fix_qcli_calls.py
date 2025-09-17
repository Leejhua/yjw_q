import re

# 读取文件
with open('server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 替换所有有问题的Q CLI调用
# 模式1: 直接命令行调用
pattern1 = r'const command = `q chat --no-interactive --trust-all-tools "\$\{enhancedPrompt\.replace\(/"/g, \'\\\\"\'\)\}"`;\s*console\.log\(`📋 [^`]+`\);\s*\n\s*const child = spawn\(\'bash\', \[\'-c\', command\][^}]+\}[^}]+\}[^}]+\}[^}]+\}[^}]+\}[^}]+\};'

# 替换为简单的callQCLI调用
replacement1 = 'const response = await callQCLI(enhancedPrompt);'

# 执行替换
content = re.sub(pattern1, replacement1, content, flags=re.DOTALL)

# 模式2: exec调用
pattern2 = r'const command = `q chat --no-interactive --trust-all-tools "\$\{enhancedPrompt\.replace\(/"/g, \'\\\\"\'\)\}"`;\s*console\.log\(`📋 [^`]+`\);\s*\n\s*exec\(command[^}]+\}[^}]+\}[^}]+\};'

content = re.sub(pattern2, replacement1, content, flags=re.DOTALL)

# 写回文件
with open('server.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("修复完成")
