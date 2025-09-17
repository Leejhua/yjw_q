import React, { useState, useEffect, useRef } from 'react';
import { List } from 'antd';

// 优化后的消息滚动组件示例
const OptimizedChatPanel = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  
  // 关键的ref引用
  const endRef = useRef(null); // 滚动锚点
  const messagesContainerRef = useRef(null); // 消息容器
  const prevMessagesLengthRef = useRef(0); // 记录上一次消息数量
  const isUserScrollingRef = useRef(false); // 用户是否在手动滚动
  
  // 优化的滚动函数
  const scrollToBottom = () => {
    if (endRef.current && messagesContainerRef.current) {
      // 使用 setTimeout 确保 DOM 更新完成后再滚动
      setTimeout(() => {
        endRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      }, 0);
    }
  };

  // 检测用户是否在手动滚动
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50; // 50px容差
      isUserScrollingRef.current = !isAtBottom;
    }
  };

  // 监听messages变化，智能滚动
  useEffect(() => {
    const currentLength = messages.length;
    const prevLength = prevMessagesLengthRef.current;
    
    // 只在以下情况滚动：
    // 1. 消息数量增加（新消息）
    // 2. 用户没有手动滚动到其他位置
    if (currentLength > prevLength && currentLength > 0 && !isUserScrollingRef.current) {
      scrollToBottom();
    }
    
    // 更新记录的消息数量
    prevMessagesLengthRef.current = currentLength;
  }, [messages]);

  // 组件挂载时滚动到底部
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, []);

  // 发送消息时重置滚动状态
  const handleSendMessage = (text) => {
    isUserScrollingRef.current = false; // 重置滚动状态
    
    // 添加用户消息
    const userMessage = {
      id: Date.now() + '-user',
      type: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // 模拟AI回复
    setTimeout(() => {
      const aiMessage = {
        id: Date.now() + '-ai',
        type: 'ai',
        content: '这是AI的回复...',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiMessage]);
    }, 1000);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 消息容器 */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        style={{ 
          flex: 1,
          height: "calc(100vh - 200px)",
          overflow: "auto",
          overflowY: "auto",
          padding: 24,
        }}
      >
        <List
          dataSource={messages}
          split={false}
          renderItem={(message) => (
            <List.Item
              key={message.id} // 稳定的唯一key，避免重建
              style={{
                padding: "24px 20px",
                borderBottom: "none",
                display: "flex",
                justifyContent: message.type === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "70%",
                  padding: "16px 20px",
                  borderRadius: "18px",
                  backgroundColor: message.type === "user" ? "#1890ff" : "#f6f6f6",
                  color: message.type === "user" ? "white" : "#333",
                  wordBreak: "break-word",
                  lineHeight: "1.4",
                }}
              >
                {message.content}
                <div style={{ 
                  fontSize: 11, 
                  opacity: 0.6, 
                  marginTop: 8,
                  fontStyle: "italic"
                }}>
                  {new Date(message.timestamp).toLocaleString("zh-CN")}
                </div>
              </div>
            </List.Item>
          )}
        />
        
        {/* 滚动锚点 */}
        <div ref={endRef} />
      </div>

      {/* 输入区域 */}
      <div style={{ padding: "20px 24px", borderTop: "1px solid #f0f0f0" }}>
        <div style={{ display: "flex", gap: 12 }}>
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inputText.trim()) {
                handleSendMessage(inputText);
                setInputText("");
              }
            }}
            placeholder="输入消息..."
            style={{ flex: 1, padding: 8 }}
          />
          <button 
            onClick={() => {
              if (inputText.trim()) {
                handleSendMessage(inputText);
                setInputText("");
              }
            }}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
};

export default OptimizedChatPanel;
