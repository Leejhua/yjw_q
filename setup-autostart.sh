#!/bin/bash

# 设置开机自启动
setup_autostart() {
    echo "🔧 设置开机自启动..."
    
    # 创建启动脚本
    cat > /home/yjw/Ai-1.0/autostart.sh << 'EOF'
#!/bin/bash
cd /home/yjw/Ai-1.0
./pm2-manage.sh start
EOF
    
    chmod +x /home/yjw/Ai-1.0/autostart.sh
    
    # 添加到用户的 .bashrc 或 .profile
    if ! grep -q "autostart.sh" ~/.bashrc; then
        echo "" >> ~/.bashrc
        echo "# AI服务自启动" >> ~/.bashrc
        echo "/home/yjw/Ai-1.0/autostart.sh" >> ~/.bashrc
        echo "✅ 已添加到 ~/.bashrc"
    fi
    
    # 创建systemd用户服务（更可靠）
    mkdir -p ~/.config/systemd/user
    
    cat > ~/.config/systemd/user/ai-autostart.service << 'EOF'
[Unit]
Description=AI Service Auto Start
After=network.target

[Service]
Type=oneshot
ExecStart=/home/yjw/Ai-1.0/autostart.sh
RemainAfterExit=yes

[Install]
WantedBy=default.target
EOF
    
    # 启用用户服务
    systemctl --user daemon-reload
    systemctl --user enable ai-autostart.service
    
    echo "✅ 开机自启动设置完成！"
    echo "🔄 重启后服务将自动启动"
}

setup_autostart
