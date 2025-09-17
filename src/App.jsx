import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { API_BASE_URL } from './config.js';
import {
  Layout,
  Menu,
  Input,
  Button,
  List,
  Card,
  Modal,
  Form,
  Select,
  Tabs,
  Tooltip,
  Badge,
  Divider,
  Upload,
  Spin,
  Typography,
  Alert,
  Empty,
  Tag,
  message,
  Checkbox,
  Descriptions,
} from "antd";
import {
  MessageOutlined,
  DatabaseOutlined,
  AppstoreOutlined,
  SettingOutlined,
  SendOutlined,
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  DownloadOutlined,
  UploadOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  EditOutlined,
} from "@ant-design/icons";

const { Header, Sider, Content } = Layout;
const { TextArea } = Input;
const { Text } = Typography;
const { Option } = Select;

// 聊天面板组件 - 移到App外部避免重复创建
const ChatPanel = ({ messages, handleSendMessage, qCliStatus, memories, laoziSession, exitLaoziMode }) => {
  const [inputText, setInputText] = useState("");
  const messagesContainerRef = useRef(null);
  const scrollStateRef = useRef({
    prevScrollHeight: 0,
    prevScrollTop: 0,
    prevClientHeight: 0,
    wasAtBottom: true
  });
  
  // 组件挂载/卸载日志
  useEffect(() => {
    console.log('🟢 ChatPanel 组件挂载');
    return () => {
      console.log('🔴 ChatPanel 组件卸载');
    };
  }, []);
  
  // 日志函数
  const logScrollState = (label) => {
    if (messagesContainerRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = messagesContainerRef.current;
      console.log(`[${label}] scrollHeight: ${scrollHeight}, scrollTop: ${scrollTop}, clientHeight: ${clientHeight}`);
      return { scrollHeight, scrollTop, clientHeight };
    }
    return null;
  };

  // 检查是否在底部
  const isAtBottom = (scrollTop, scrollHeight, clientHeight) => {
    return scrollTop + clientHeight >= scrollHeight - 20;
  };

  // 核心滚动逻辑 - 使用 useLayoutEffect 确保在浏览器绘制前执行
  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || messages.length === 0) return;

    console.log('=== 消息渲染后滚动处理 ===');
    
    // 记录当前状态
    const currentState = logScrollState('渲染后');
    if (!currentState) return;

    const { scrollHeight, scrollTop, clientHeight } = currentState;
    const { prevScrollHeight, prevScrollTop, prevClientHeight, wasAtBottom } = scrollStateRef.current;

    // 计算高度差
    const heightDiff = scrollHeight - prevScrollHeight;
    
    console.log(`高度变化: ${heightDiff}, 之前是否在底部: ${wasAtBottom}`);

    // 使用 requestAnimationFrame 确保在下一帧执行
    requestAnimationFrame(() => {
      // 临时关闭平滑滚动
      const originalScrollBehavior = container.style.scrollBehavior;
      container.style.scrollBehavior = 'auto';

      try {
        if (wasAtBottom) {
          // 如果之前在底部，滚动到新的底部
          container.scrollTop = scrollHeight - clientHeight;
          console.log(`滚动到底部: ${container.scrollTop}`);
        } else if (heightDiff > 0) {
          // 如果不在底部但有新内容，保持相对位置
          const newScrollTop = prevScrollTop + heightDiff;
          container.scrollTop = newScrollTop;
          console.log(`保持相对位置: ${newScrollTop}`);
        }
      } finally {
        // 恢复平滑滚动
        container.style.scrollBehavior = originalScrollBehavior;
      }

      // 更新状态记录
      scrollStateRef.current = {
        prevScrollHeight: container.scrollHeight,
        prevScrollTop: container.scrollTop,
        prevClientHeight: container.clientHeight,
        wasAtBottom: isAtBottom(container.scrollTop, container.scrollHeight, container.clientHeight)
      };

      logScrollState('滚动完成');
    });
  }, [messages]);

  // 滚动事件处理 - 更新是否在底部的状态
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    scrollStateRef.current.wasAtBottom = isAtBottom(scrollTop, scrollHeight, clientHeight);
    scrollStateRef.current.prevScrollTop = scrollTop;
  };

  // 初始化滚动状态
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container && messages.length > 0) {
      scrollStateRef.current = {
        prevScrollHeight: container.scrollHeight,
        prevScrollTop: container.scrollTop,
        prevClientHeight: container.clientHeight,
        wasAtBottom: true
      };
    }
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (inputText.trim()) {
        handleSendMessage(inputText);
        setInputText("");
      }
    }
  };

  const handleSend = () => {
    if (inputText.trim()) {
      handleSendMessage(inputText);
      setInputText("");
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* 固定的老祖提示框 - 不参与滚动 */}
      {laoziSession && !laoziSession.isCompleted && (
        <div style={{ padding: "16px 24px 0 24px" }}>
          <Alert
            message="🧙♂️ 老祖评测模式进行中"
            description={`当前进度：第${laoziSession.currentQuestion}问 (${laoziSession.progress})`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            action={<Button size="small" onClick={exitLaoziMode}>退出</Button>}
          />
        </div>
      )}
      
      <div 
        ref={messagesContainerRef}
        data-scroll-container
        onScroll={handleScroll}
        style={{ 
          flex: 1,
          height: "calc(100vh - 200px)", // 固定高度
          overflow: "auto", // 启用滚动
          overflowY: "auto", // 明确启用垂直滚动
          padding: 24,
        }}
      >
        <Card 
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>AI私人助理</span>
              <Tag color={qCliStatus.available ? 'green' : 'red'}>
                {qCliStatus.available ? 'Q CLI' : 'Q CLI (不可用)'}
              </Tag>
            </div>
          } 
          style={{ marginBottom: 16 }}
        >
          <Text type="secondary">
            我是您的私人AI助理，可以帮助您管理记忆、执行指令、回答各种问题。
            {memories.length > 0 && (
              <span style={{ color: '#52c41a', marginLeft: 8 }}>
                ✅ 已加载 {memories.length} 条个人记忆
              </span>
            )}
          </Text>
        </Card>

        <List
          dataSource={messages}
          split={false}
          renderItem={(message) => (
            <List.Item
              key={message.id} // 使用稳定的唯一key
              style={{
                padding: "24px 20px",
                borderBottom: "none",
                display: "flex",
                justifyContent: message.type === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "75%",
                  padding: "16px 20px",
                  borderRadius: message.type === "user" ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                  backgroundColor: message.type === "user" 
                    ? "#667eea" 
                    : "#ffffff",
                  color: message.type === "user" ? "white" : "#333333",
                  whiteSpace: "pre-wrap",
                  lineHeight: "1.6",
                  fontSize: "15px",
                  boxShadow: message.type === "user" 
                    ? "0 4px 12px rgba(102, 126, 234, 0.3)" 
                    : "0 4px 12px rgba(0, 0, 0, 0.1)",
                  border: message.type === "user" ? "none" : "1px solid #f0f0f0",
                  position: "relative"
                }}
              >
                {/* 消息尾巴 */}
                <div style={{
                  position: "absolute",
                  bottom: "12px",
                  [message.type === "user" ? "right" : "left"]: "-6px",
                  width: "0",
                  height: "0",
                  borderStyle: "solid",
                  borderWidth: message.type === "user" 
                    ? "6px 0 6px 6px" 
                    : "6px 6px 6px 0",
                  borderColor: message.type === "user" 
                    ? "transparent transparent transparent #667eea" 
                    : "transparent #ffffff transparent transparent"
                }} />
                
                {message.loading ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Spin 
                      indicator={<LoadingOutlined spin />} 
                      style={{ color: message.type === "user" ? "white" : "#1890ff" }}
                    />
                    <span style={{ 
                      fontSize: "14px",
                      fontStyle: "italic",
                      opacity: 0.8
                    }}>
                      AI正在思考中...
                    </span>
                  </div>
                ) : (
                  <div>
                    <div style={{ marginBottom: message.references ? 12 : 0 }}>
                      {message.type === "user" ? (
                        message.content
                      ) : (
                        <div style={{ lineHeight: '1.5', fontSize: '14px' }}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                    {message.references && message.references.length > 0 && (
                      <div style={{ 
                        marginTop: 12, 
                        paddingTop: 12,
                        borderTop: "1px solid rgba(255,255,255,0.2)",
                        fontSize: 12, 
                        opacity: 0.8
                      }}>
                        <strong>📚 相关记忆：</strong>
                        {message.references.map((ref) => ref.category).join(", ")}
                      </div>
                    )}
                  </div>
                )}
                <div style={{ 
                  fontSize: 11, 
                  opacity: 0.6, 
                  marginTop: 8,
                  textAlign: message.type === "user" ? "right" : "left",
                  fontStyle: "italic"
                }}>
                  {new Date(message.timestamp).toLocaleString("zh-CN")}
                </div>
              </div>
            </List.Item>
          )}
        />
      </div>

      <div style={{ 
        padding: "20px 24px", 
        borderTop: "2px solid #f0f0f0",
        background: "#fafafa",
        boxShadow: "0 -4px 12px rgba(0,0,0,0.05)"
      }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <Input.TextArea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入您的问题或指令..."
            autoSize={{ minRows: 1, maxRows: 6 }}
            style={{ 
              flex: 1,
              fontSize: "15px",
              borderRadius: "12px",
              border: "2px solid #e8e8e8",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
            }}
          />
          <Button
            type="primary"
            onClick={handleSend}
            disabled={!inputText.trim()}
            style={{
              height: "auto",
              minHeight: "40px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              border: "none",
              boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
              fontSize: "15px",
              fontWeight: "500"
            }}
          >
            发送
          </Button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [currentTab, setCurrentTab] = useState("chat");
  const [logs, setLogs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [memories, setMemories] = useState([]);
  const [personalMemories, setPersonalMemories] = useState([]);
  const [instructionMemories, setInstructionMemories] = useState([]);
  const [memoryViewType, setMemoryViewType] = useState('all');
  const [autoRefreshLogs, setAutoRefreshLogs] = useState(false);
  const [selectedMemories, setSelectedMemories] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [qCliStatus, setQCliStatus] = useState({ available: false, sessions: 0 });
  const [instructions, setInstructions] = useState([]);
  const [instructionsLoading, setInstructionsLoading] = useState(false);
  const [showCreateInstructionModal, setShowCreateInstructionModal] = useState(false);
  const [laoziSession, setLaoziSession] = useState(null);

  // 检查Q CLI状态
  const checkQCliStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/q-status`);
      if (response.ok) {
        const status = await response.json();
        setQCliStatus(status);
        return status.available;
      }
    } catch (error) {
      console.error('检查Q CLI状态失败:', error);
      
      // 检查是否是HTTPS/HTTP混合内容问题
      if (error.message.includes('Mixed Content') || 
          error.message.includes('blocked') ||
          window.location.protocol === 'https:' && API_BASE_URL.startsWith('http:')) {
        setQCliStatus({ 
          available: false, 
          sessions: 0, 
          error: 'HTTPS页面无法访问HTTP后端，请使用HTTPS隧道或允许不安全内容' 
        });
      } else {
        setQCliStatus({ available: false, sessions: 0, error: error.message });
      }
    }
    return false;
  };

  // 获取后台日志
  const fetchLogs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/logs`);
      if (response.ok) {
        const logData = await response.text();
        const logLines = logData.split('\n').filter(line => line.trim()).slice(-100); // 只显示最后100行
        setLogs(logLines);
      }
    } catch (error) {
      console.error('获取日志失败:', error);
    }
  };

  // 自动刷新日志
  useEffect(() => {
    if (currentTab === 'logs') {
      fetchLogs();
      if (autoRefreshLogs) {
        const interval = setInterval(fetchLogs, 2000); // 每2秒刷新
        return () => clearInterval(interval);
      }
    }
  }, [currentTab, autoRefreshLogs]);

  // 加载记忆文件
  useEffect(() => {
    const loadMemories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/memories`);
        if (response.ok) {
          const allMemories = await response.json();
          setMemories(allMemories);
          
          // 分类存储
          const personal = allMemories.filter(m => m.memoryType === 'personal');
          const instruction = allMemories.filter(m => m.memoryType === 'instruction');
          
          setPersonalMemories(personal);
          setInstructionMemories(instruction);
          
          addLog("success", "记忆库加载完成", 
            `共加载 ${allMemories.length} 条记忆 (个人: ${personal.length}, 指令: ${instruction.length})`);
        }
      } catch (error) {
        console.error('读取记忆失败:', error);
        addLog("error", "记忆库加载失败", error.message);
      }
    };
    
    loadMemories();
    loadInstructions();
    loadLaoziSession();
    checkQCliStatus();
  }, []);

  // 加载指令列表
  const loadInstructions = async () => {
    setInstructionsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/instructions-new`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setInstructions(data.instructions);
        }
      }
    } catch (error) {
      console.error('加载指令列表失败:', error);
    } finally {
      setInstructionsLoading(false);
    }
  };

  // 加载老祖评测会话状态
  const loadLaoziSession = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/laozi-session/default`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLaoziSession(data.session);
        }
      }
    } catch (error) {
      console.error('加载老祖会话状态失败:', error);
    }
  };

  // 处理发送消息
  const handleSendMessage = async (text) => {
    if (!text?.trim()) return;

    // 发送前记录滚动状态
    console.log('=== 发送消息前 ===');
    const container = document.querySelector('[data-scroll-container]');
    if (container) {
      console.log(`发送前 - scrollHeight: ${container.scrollHeight}, scrollTop: ${container.scrollTop}, clientHeight: ${container.clientHeight}`);
    }

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);

    // 检查是否是搜索请求
    const isSearchQuery = text.includes('搜索') || text.includes('查询') || text.startsWith('search:');
    
    if (isSearchQuery) {
      // 添加加载消息
      const loadingMessage = {
        id: Date.now() + 1,
        type: "assistant",
        content: "",
        loading: true,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, loadingMessage]);

      try {
        // 提取搜索关键词
        const searchQuery = text.replace(/搜索|查询|search:/g, '').trim();
        
        // 调用搜索API
        const searchResponse = await fetch(`${API_BASE_URL}/api/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery })
        });
        
        const searchData = await searchResponse.json();
        
        let responseContent = '';
        if (searchData.success) {
          responseContent = `🔍 **搜索结果：${searchQuery}**\n\n`;
          responseContent += `${searchData.result}\n\n`;
          
          if (searchData.source) {
            responseContent += `📖 **来源：** ${searchData.source}\n\n`;
          }
          
          if (searchData.relatedTopics && searchData.relatedTopics.length > 0) {
            responseContent += `🔗 **相关话题：**\n`;
            searchData.relatedTopics.forEach(topic => {
              responseContent += `• ${topic.text}\n`;
            });
          }
        } else {
          responseContent = `❌ 搜索失败：${searchData.error}`;
        }

        // 更新消息
        setMessages(prev => prev.map(msg => 
          msg.id === loadingMessage.id 
            ? { ...msg, content: responseContent, loading: false }
            : msg
        ));
        
      } catch (error) {
        console.error('搜索错误:', error);
        setMessages(prev => prev.map(msg => 
          msg.id === loadingMessage.id 
            ? { ...msg, content: `❌ 搜索服务不可用：${error.message}`, loading: false }
            : msg
        ));
      }
      return;
    }

    const loadingMessage = {
      id: Date.now() + 1,
      type: "ai",
      content: "正在思考中...",
      timestamp: new Date().toISOString(),
      loading: true,
    };
    setMessages(prev => [...prev, loadingMessage]);

    try {
      const relevantMemories = findRelevantMemories(text);
      const result = await generateAIResponse(text, relevantMemories);

      setMessages(prev =>
        prev.map(msg =>
          msg.id === loadingMessage.id
            ? { 
                ...msg, 
                content: result.response, 
                loading: false, 
                references: result.actuallyUsedMemories
              }
            : msg
        )
      );

      // 检测老祖会话状态变化
      if (result.response.includes('AI修仙老祖评测已完成')) {
        setLaoziSession(null);
      } else if (result.response.includes('老祖') || result.response.includes('弟子')) {
        loadLaoziSession();
      }
    } catch (error) {
      setMessages(prev => prev.filter(msg => msg.id !== loadingMessage.id));
      message.error({ content: error.message, duration: 2 });
    }
  };

  // 查找相关记忆
  const findRelevantMemories = (query) => {
    if (!query || !memories || memories.length === 0) return [];

    const searchQuery = query.toLowerCase();
    const broadQueries = ['什么', '谁', '哪里', '怎样', '如何', '介绍', '关于', '告诉我', '说说'];
    
    if (broadQueries.some(word => searchQuery.includes(word)) || searchQuery.length <= 3) {
      return memories;
    }

    const keywords = searchQuery.split(/\s+/).filter(keyword => keyword.length > 1);
    if (keywords.length === 0) return memories;

    const scoredMemories = memories.map(memory => {
      const memoryText = (memory.title + " " + memory.content + " " + memory.category).toLowerCase();
      let score = 0;

      keywords.forEach(keyword => {
        const matches = memoryText.match(new RegExp(keyword, 'gi'));
        if (matches) {
          score += matches.length * 2;
          if (memory.title.toLowerCase().includes(keyword)) score += 5;
          if (memory.category.toLowerCase().includes(keyword)) score += 4;
        }
      });

      return { memory, score };
    });

    const relevantMemories = scoredMemories
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.memory);

    return relevantMemories.length > 0 ? relevantMemories : memories;
  };

  // 生成AI回复
  const generateAIResponse = async (userMessage, relevantMemories) => {
    addLog("info", "开始生成AI回复", userMessage);
    
    // 直接调用Q CLI，不检查状态
    const result = await chatWithQCli(userMessage, relevantMemories);
    return result; // 返回包含response和actuallyUsedMemories的对象
  };

  // Q CLI对话
  const chatWithQCli = async (userMessage, relevantMemories) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat-with-q`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          sessionId: 'default',
          memories: relevantMemories
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Q CLI调用失败');
      }

      const data = await response.json();
      
      // 如果Q CLI执行了文件操作，刷新记忆库
      if (data.response && data.response.includes('fs_write')) {
        try {
          await fetch(`${API_BASE_URL}/api/memories/refresh`, { method: 'POST' });
          const memResponse = await fetch(`${API_BASE_URL}/api/memories`);
          if (memResponse.ok) {
            const updatedMemories = await memResponse.json();
            setMemories(updatedMemories);
          }
        } catch (refreshError) {
          console.error('刷新记忆库失败:', refreshError);
        }
      }
      
      // 返回完整数据，包括实际使用的记忆
      return {
        response: data.response,
        actuallyUsedMemories: data.actuallyUsedMemories || []
      };
    } catch (error) {
      console.error('Q CLI对话错误:', error);
      throw error;
    }
  };

  // 添加日志
  const addLog = (type, message, details = "") => {
    const newLog = {
      id: Date.now(),
      type,
      message,
      details,
      timestamp: new Date().toLocaleTimeString(),
    };
    setLogs(prev => [newLog, ...prev.slice(0, 19)]);
  };

  // 切换标签页
  const switchToTab = (tabName) => {
    setCurrentTab(tabName);
  };

  // 删除指令
  const deleteInstruction = async (instruction) => {
    Modal.confirm({
      title: '确认删除指令',
      content: `确定要删除指令"${instruction.name}"吗？此操作不可恢复。`,
      icon: <ExclamationCircleOutlined />,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          console.log('删除指令:', instruction);
          const response = await fetch(`${API_BASE_URL}/api/delete-instruction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              domain: instruction.domain,
              name: instruction.name 
            })
          });
          
          const result = await response.json();
          console.log('删除响应:', result);
          
          if (response.ok && result.success) {
            message.success('指令删除成功！');
            loadInstructions();
          } else {
            throw new Error(result.error || '删除失败');
          }
        } catch (error) {
          console.error('删除指令失败:', error);
          message.error(`删除指令失败：${error.message}`);
        }
      }
    });
  };

  // 预览指令
  const previewInstruction = async (instruction) => {
    setPreviewLoading(true);
    setPreviewVisible(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/instruction-preview/${encodeURIComponent(instruction.domain)}/${encodeURIComponent(instruction.name)}`);
      const data = await response.json();
      
      if (data.success) {
        setPreviewData({
          instruction,
          ...data.preview
        });
      } else {
        message.error('获取预览信息失败');
      }
    } catch (error) {
      console.error('预览指令失败:', error);
      message.error('预览指令失败');
    } finally {
      setPreviewLoading(false);
    }
  };

  // 执行指令
  const executeInstruction = (instruction) => {
    switchToTab("chat");
    setTimeout(() => {
      handleSendMessage(instruction.triggerMessage);
    }, 200);
    message.success(`正在启动指令：${instruction.name}`);
  };

  // 退出老祖模式
  const exitLaoziMode = async () => {
    try {
      // 1. 立即清除前端状态
      setLaoziSession(null);
      
      // 2. 调用后端API清除会话
      await fetch(`${API_BASE_URL}/api/laozi-session/default/reset`, {
        method: 'POST'
      });
      
      // 3. 发送退出消息确保后端状态同步
      handleSendMessage("退出老祖");
      
      message.success('已退出老祖模式');
    } catch (error) {
      console.error('退出老祖模式失败:', error);
      // 即使API调用失败，也清除前端状态
      setLaoziSession(null);
      message.success('已退出老祖模式');
    }
  };

  // 记忆库组件
  // 编辑记忆表单组件
  const EditMemoryForm = ({ memory, onSave }) => {
    const [form] = Form.useForm();
    
    const categories = [
      '个人信息', '人生规划', '个人价值', 
      '个人成就', '生活习惯', '人际关系'
    ];

    const handleSubmit = (values) => {
      onSave(values);
    };

    return (
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          title: memory.title,
          category: memory.category,
          content: memory.content
        }}
        onFinish={handleSubmit}
        style={{ marginTop: 16 }}
      >
        <Form.Item
          name="title"
          label="标题"
          rules={[{ required: true, message: '请输入标题' }]}
        >
          <Input placeholder="请输入记忆标题" />
        </Form.Item>
        
        <Form.Item
          name="category"
          label="分类"
          rules={[{ required: true, message: '请选择分类' }]}
        >
          <Select placeholder="请选择分类">
            {categories.map(cat => (
              <Select.Option key={cat} value={cat}>{cat}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        
        <Form.Item
          name="content"
          label="内容"
          rules={[{ required: true, message: '请输入内容' }]}
        >
          <Input.TextArea 
            rows={8} 
            placeholder="请输入记忆内容"
            style={{ resize: 'vertical' }}
          />
        </Form.Item>
        
        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button 
            onClick={() => Modal.destroyAll()} 
            style={{ marginRight: 8 }}
          >
            取消
          </Button>
          <Button type="primary" htmlType="submit">
            保存
          </Button>
        </Form.Item>
      </Form>
    );
  };

  const MemoryLibrary = () => {
    // 获取当前显示的记忆列表
    const getCurrentMemories = () => {
      switch (memoryViewType) {
        case 'personal':
          return personalMemories;
        case 'instruction':
          return instructionMemories;
        default:
          return memories;
      }
    };

    // 获取记忆类型标签
    const getMemoryTypeTag = (memory) => {
      if (memory.memoryType === 'personal') {
        return <Tag color="blue">💭 个人记忆</Tag>;
      } else if (memory.memoryType === 'instruction') {
        return <Tag color="green">⚡ 指令记忆</Tag>;
      }
      return null;
    };

    // 获取副标签
    const getSubTag = (memory) => {
      if (memory.memoryType === 'instruction') {
        return <Tag color="orange">{memory.domain}</Tag>;
      } else {
        return (
          <Tag 
            color={
              memory.category === '个人信息' ? 'blue' :
              memory.category === '人生规划' ? 'green' :
              memory.category === '个人价值' ? 'purple' :
              memory.category === '个人成就' ? 'gold' :
              memory.category === '生活习惯' ? 'cyan' :
              memory.category === '人际关系' ? 'magenta' :
              'default'
            }
            style={{ 
              fontSize: '12px', 
              padding: '2px 8px',
              borderRadius: '6px',
              fontWeight: 'bold',
              flexShrink: 0
            }}
          >
            {memory.category}
          </Tag>
        );
      }
    };

    // 预览记忆
    const previewMemory = (memory) => {
      Modal.info({
        title: null, // 移除默认标题
        width: 800,
        style: { top: 20 },
        bodyStyle: { padding: 0 },
        footer: null, // 移除底部按钮
        closable: true, // 启用右上角关闭按钮
        maskClosable: true, // 点击遮罩关闭
        closeIcon: (
          <div style={{
            width: '28px',
            height: '28px',
            backgroundColor: '#ff4d4f',
            borderRadius: '4px', // 方形圆角
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(255, 77, 79, 0.3)',
            transition: 'all 0.2s',
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 1000
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#ff7875';
            e.target.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#ff4d4f';
            e.target.style.transform = 'scale(1)';
          }}
          >
            ×
          </div>
        ),
        content: (
          <div style={{ 
            padding: '24px',
            paddingTop: '60px', // 为顶部关闭按钮留出空间
            maxHeight: '75vh', 
            overflow: 'auto',
            position: 'relative'
          }}>
            {/* 自定义标题栏 */}
            <div style={{ 
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '2px solid #f0f0f0'
            }}>
              <h2 style={{ 
                margin: 0,
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#262626'
              }}>
                {memory.title || '记忆详情'}
              </h2>
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {getMemoryTypeTag(memory)}
                <Tag color="blue" style={{ fontSize: '13px', padding: '4px 12px' }}>
                  {memory.category}
                </Tag>
                {memory.instructionType && (
                  <Tag color="purple" style={{ fontSize: '13px', padding: '4px 12px' }}>
                    {memory.instructionType}
                  </Tag>
                )}
              </div>
            </div>
            
            {/* 内容区域 */}
            <div style={{ 
              padding: '20px',
              backgroundColor: '#fafafa',
              borderRadius: '8px',
              border: '1px solid #e8e8e8',
              whiteSpace: 'pre-wrap',
              lineHeight: '1.6',
              fontSize: '15px',
              color: '#333',
              minHeight: '200px'
            }}>
              {memory.content}
            </div>
            
            {/* 底部信息 */}
            <div style={{ 
              marginTop: '20px',
              padding: '16px',
              backgroundColor: '#f9f9f9',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#666',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>
                📅 创建时间: {new Date(memory.timestamp).toLocaleString('zh-CN')}
              </span>
              {memory.filename && (
                <span>
                  📄 文件: {memory.filename}
                </span>
              )}
            </div>
          </div>
        )
      });
    };

    // 删除记忆
    const deleteMemory = async (memory) => {
      Modal.confirm({
        title: '确认删除记忆？',
        content: `确定要删除记忆"${memory.title || '无标题'}"吗？此操作不可恢复。`,
        okText: '删除',
        okType: 'danger',
        cancelText: '取消',
        async onOk() {
          try {
            // 保存当前滚动位置
            const scrollContainer = document.querySelector('[data-memory-scroll-container]');
            const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
            
            // 调用后端API删除记忆文件
            const response = await fetch(`${API_BASE_URL}/api/memories/${memory.filename}`, {
              method: 'DELETE'
            });
            
            if (response.ok) {
              // 从前端状态中删除
              setMemories(prev => prev.filter(m => m.id !== memory.id));
              message.success('记忆已删除');
              
              // 恢复滚动位置
              setTimeout(() => {
                if (scrollContainer) {
                  scrollContainer.scrollTop = scrollTop;
                }
              }, 50);
            } else {
              const error = await response.json();
              message.error(`删除失败: ${error.error || '未知错误'}`);
            }
          } catch (error) {
            console.error('删除记忆失败:', error);
            message.error('删除失败，请检查网络连接');
          }
        }
      });
    };

    // 编辑记忆
    const editMemory = (memory) => {
      Modal.confirm({
        title: '编辑记忆',
        width: 600,
        content: (
          <EditMemoryForm 
            memory={memory} 
            onSave={(updatedMemory) => {
              handleSaveMemory(memory, updatedMemory);
            }}
          />
        ),
        footer: null,
        closable: true,
        maskClosable: false
      });
    };

    // 保存编辑后的记忆
    const handleSaveMemory = async (originalMemory, updatedMemory) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/memories/${originalMemory.filename}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedMemory)
        });

        if (response.ok) {
          // 更新前端状态
          setMemories(prev => prev.map(m => 
            m.id === originalMemory.id 
              ? { ...m, ...updatedMemory, timestamp: new Date().toISOString() }
              : m
          ));
          message.success('记忆已更新');
          Modal.destroyAll();
        } else {
          const error = await response.json();
          message.error(`更新失败: ${error.error || '未知错误'}`);
        }
      } catch (error) {
        console.error('更新记忆失败:', error);
        message.error('更新失败，请检查网络连接');
      }
    };

    return (
      <div style={{ padding: 24, height: "100vh", overflow: "auto" }} data-memory-scroll-container>
        <Card 
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>记忆库</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={async () => {
                    try {
                      const response = await fetch(`${API_BASE_URL}/api/memories`);
                      if (response.ok) {
                        const allMemories = await response.json();
                        const personal = allMemories.filter(m => m.memoryType === 'personal');
                        const instruction = allMemories.filter(m => m.memoryType === 'instruction');
                        
                        setPersonalMemories(personal);
                        setInstructionMemories(instruction);
                        
                        message.success(`记忆库已刷新 (${allMemories.length}条记忆)`);
                      }
                    } catch (error) {
                      message.error('刷新失败: ' + error.message);
                    }
                  }}
                  size="small"
                  title="刷新记忆库"
                >
                  刷新
                </Button>
                <span style={{ fontSize: '14px', color: '#666' }}>记忆类型:</span>
                <Select
                  value={memoryViewType}
                  onChange={setMemoryViewType}
                  style={{ width: 120 }}
                  size="small"
                >
                  <Option value="all">全部记忆</Option>
                  <Option value="personal">💭 个人记忆</Option>
                  <Option value="instruction">⚡ 指令记忆</Option>
                </Select>
                <Tag color={memoryViewType === 'personal' ? 'blue' : memoryViewType === 'instruction' ? 'green' : 'default'}>
                  {getCurrentMemories().length} 条
                </Tag>
              </div>
            </div>
          }
        >
          {getCurrentMemories().length === 0 ? (
            <Empty description={
              memoryViewType === 'personal' ? '暂无个人记忆' :
              memoryViewType === 'instruction' ? '暂无指令记忆' :
              '记忆库为空'
            } />
          ) : (
            <List
              dataSource={getCurrentMemories()}
              renderItem={(memory) => (
                <List.Item style={{ 
                  padding: '12px 16px', 
                  border: '2px solid #f0f0f0', 
                  borderRadius: '12px', 
                  marginBottom: '8px',
                  background: memory.memoryType === 'instruction' 
                    ? 'linear-gradient(135deg, #f6ffed 0%, #f0f9ff 100%)'
                    : 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  minHeight: '52px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                }}
                >
                  <div style={{ 
                    width: '100%', 
                    display: 'grid',
                    gridTemplateColumns: '1fr 240px 140px',
                    alignItems: 'center',
                    gap: 16
                  }}>
                    {/* 标签+标题列 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      {getMemoryTypeTag(memory)}
                      {getSubTag(memory)}
                      <Text strong style={{ 
                        fontSize: '18px', 
                        color: '#262626',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0
                      }}>
                        {memory.title || '无标题'}
                      </Text>
                    </div>
                    
                    {/* 按钮列 */}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <Button
                        size="small"
                        type="primary"
                        icon={<EyeOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          previewMemory(memory);
                        }}
                        style={{
                          borderRadius: '6px',
                          backgroundColor: '#52c41a',
                          border: 'none',
                          color: 'white',
                          fontSize: '12px',
                          height: '28px'
                        }}
                      >
                        预览
                      </Button>
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          editMemory(memory);
                        }}
                        style={{
                          borderRadius: '6px',
                          backgroundColor: '#1890ff',
                          border: 'none',
                          color: 'white',
                          fontSize: '12px',
                          height: '28px'
                        }}
                      >
                        编辑
                      </Button>
                      <Button
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMemory(memory);
                        }}
                        style={{
                          borderRadius: '6px',
                          backgroundColor: '#ff4d4f',
                          border: 'none',
                          color: 'white',
                          fontSize: '12px',
                          height: '28px'
                        }}
                      >
                        删除
                      </Button>
                    </div>
                    
                    {/* 时间列 */}
                    <Text type="secondary" style={{ 
                      fontSize: '11px', 
                      fontStyle: 'italic',
                      textAlign: 'right',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {new Date(memory.timestamp).toLocaleString("zh-CN")}
                    </Text>
                  </div>
                </List.Item>
              )}
            />
          )}
        </Card>
      </div>
    );
  };

  // 指令面板组件
  const WorkflowPanel = () => {
    return (
      <div style={{ padding: 24, height: "100vh", overflow: "auto" }}>
        <Card
          title="🎯 指令中心"
          extra={
            <div style={{ display: 'flex', gap: 8 }}>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => setShowCreateInstructionModal(true)}
              >
                新建指令
              </Button>
              <Button icon={<ReloadOutlined />} onClick={loadInstructions} loading={instructionsLoading}>
                刷新
              </Button>
            </div>
          }
        >
          {laoziSession && (
            <Card 
              size="small" 
              style={{ marginBottom: 16, backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>🧙♂️ 老祖评测进行中</span>
                  <Tag color="processing">第{laoziSession.currentQuestion}问</Tag>
                </div>
              }
            >
              <div>评测进度：{laoziSession.progress} 已完成</div>
            </Card>
          )}

          {instructions.length === 0 ? (
            <Empty description="暂无可用指令" />
          ) : (
            <List
              grid={{ gutter: 16, column: 2 }}
              dataSource={instructions}
              renderItem={(instruction) => (
                <List.Item>
                  <Card
                    hoverable
                    actions={[
                      <Button
                        icon={<EyeOutlined />}
                        onClick={() => previewInstruction(instruction)}
                        style={{ marginRight: 8 }}
                      >
                        预览
                      </Button>,
                      <Button
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        onClick={() => executeInstruction(instruction)}
                      >
                        启动指令
                      </Button>
                    ]}
                  >
                    <div style={{ position: 'absolute', top: 8, right: 8 }}>
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteInstruction(instruction);
                        }}
                        style={{ color: '#ff4d4f' }}
                        title="删除指令"
                      />
                    </div>
                    <Card.Meta
                      avatar={<div style={{ fontSize: '24px' }}>{instruction.icon}</div>}
                      title={instruction.name}
                      description={instruction.description || '暂无描述'}
                    />
                  </Card>
                </List.Item>
              )}
            />
          )}

          {/* 指令预览模态框 */}
          <Modal
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <EyeOutlined />
                <span>指令预览</span>
                {previewData && (
                  <Tag color="blue">{previewData.instruction.domain}</Tag>
                )}
              </div>
            }
            open={previewVisible}
            onCancel={() => setPreviewVisible(false)}
            width={800}
            footer={null}
          >
            {previewLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>正在加载预览信息...</div>
              </div>
            ) : previewData ? (
              <div>
                <Card size="small" title="📋 基本信息" style={{ marginBottom: 16 }}>
                  <Descriptions column={2} size="small">
                    <Descriptions.Item label="指令名称">{previewData.metadata?.name}</Descriptions.Item>
                    <Descriptions.Item label="触发词">{previewData.metadata?.triggerMessage}</Descriptions.Item>
                    <Descriptions.Item label="描述">{previewData.metadata?.description}</Descriptions.Item>
                    <Descriptions.Item label="图标">{previewData.metadata?.icon}</Descriptions.Item>
                  </Descriptions>
                </Card>

                {previewData.useCases && (
                  <Card size="small" title="🎯 使用场景" style={{ marginBottom: 16 }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {previewData.useCases}
                    </ReactMarkdown>
                  </Card>
                )}

                {previewData.conversationFlow && (
                  <Card size="small" title="💬 对话流程" style={{ marginBottom: 16 }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {previewData.conversationFlow}
                    </ReactMarkdown>
                  </Card>
                )}

                {previewData.exampleDialogues && (
                  <Card size="small" title="💡 示例对话" style={{ marginBottom: 16 }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {previewData.exampleDialogues}
                    </ReactMarkdown>
                  </Card>
                )}

                {previewData.evaluationCriteria && (
                  <Card size="small" title="📊 评测标准" style={{ marginBottom: 16 }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {previewData.evaluationCriteria}
                    </ReactMarkdown>
                  </Card>
                )}

                {previewData.supportingFiles && previewData.supportingFiles.length > 0 && (
                  <Card size="small" title="📁 配套文件">
                    <List
                      size="small"
                      dataSource={previewData.supportingFiles}
                      renderItem={file => (
                        <List.Item>
                          <Typography.Text code>{file}</Typography.Text>
                        </List.Item>
                      )}
                    />
                  </Card>
                )}
              </div>
            ) : null}
          </Modal>
        </Card>
      </div>
    );
  };

  // 后台日志组件
  const LogsPanel = () => {
    return (
      <div style={{ padding: 24, height: "100vh", overflow: "auto" }}>
        <Card 
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>后台日志</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Checkbox
                  checked={autoRefreshLogs}
                  onChange={(e) => setAutoRefreshLogs(e.target.checked)}
                >
                  自动刷新
                </Checkbox>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchLogs}
                  size="small"
                >
                  刷新
                </Button>
              </div>
            </div>
          }
        >
          <div style={{ 
            backgroundColor: '#000', 
            color: '#00ff00', 
            padding: '16px', 
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '12px',
            height: '70vh',
            overflow: 'auto'
          }}>
            {!logs || logs.length === 0 ? (
              <div style={{ color: '#666' }}>暂无日志数据，点击刷新按钮加载</div>
            ) : (
              logs.map((line, index) => (
                <div key={index} style={{ marginBottom: '2px' }}>
                  {typeof line === 'string' ? line : (line.message || JSON.stringify(line))}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    );
  };

  // 敏感词检测函数
  const detectSensitiveWords = (text) => {
    const sensitiveWords = {
      '心理咨询': '心理分析工具',
      '心理治疗': '心理数据处理',
      '心理医生': '心理数据专家',
      '精神科': 'jing神ke（已转换）',
      '抑郁症': '情绪低落分析',
      '焦虑症': '紧张情绪评估',
      '心理疾病': '心理状态异常',
      '心理障碍': '心理功能评估',
      '精神病': 'jing神bing（已转换）',
      '自杀': 'zi杀（已转换）',
      '自残': 'zi残（已转换）',
      '法律咨询': '法律信息查询',
      '律师': '法律顾问',
      '起诉': '法律程序',
      '诉讼': '法律纠纷处理',
      '投资建议': '投资信息分析',
      '股票推荐': '股票数据分析',
      '理财规划': '财务数据整理',
      '贷款咨询': '贷款信息查询',
      '医疗诊断': '健康数据分析',
      '疾病诊断': '症状信息整理',
      '药物推荐': '药物信息查询',
      '治疗方案': '康复数据分析'
    };

    const detected = [];
    for (const [sensitive, replacement] of Object.entries(sensitiveWords)) {
      if (text.includes(sensitive)) {
        detected.push({ word: sensitive, suggestion: replacement });
      }
    }
    return detected;
  };

  // 创建指令模态框组件
  const CreateInstructionModal = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [sensitiveWordsDetected, setSensitiveWordsDetected] = useState([]);

    // 检测表单中的敏感词
    const checkSensitiveWords = (changedValues, allValues) => {
      const textFields = ['name', 'description', 'conversationFlow', 'evaluationCriteria'];
      let allDetected = [];
      
      textFields.forEach(field => {
        if (allValues[field]) {
          const detected = detectSensitiveWords(allValues[field]);
          allDetected = [...allDetected, ...detected.map(d => ({ ...d, field }))];
        }
      });
      
      setSensitiveWordsDetected(allDetected);
    };

    // 一键替换敏感词
    const replaceSensitiveWords = () => {
      const currentValues = form.getFieldsValue();
      let hasReplaced = false;
      
      sensitiveWordsDetected.forEach(item => {
        if (currentValues[item.field] && currentValues[item.field].includes(item.word)) {
          currentValues[item.field] = currentValues[item.field].replace(
            new RegExp(item.word, 'g'), 
            item.suggestion
          );
          hasReplaced = true;
        }
      });
      
      if (hasReplaced) {
        form.setFieldsValue(currentValues);
        checkSensitiveWords({}, currentValues);
        message.success('敏感词汇已自动替换！');
      }
    };

    const handleSubmit = async (values) => {
      setLoading(true);
      try {
        // 创建指令文件内容
        const instructionContent = `---
name: ${values.name}
description: ${values.description}
icon: ${values.icon}
triggerMessage: ${values.triggerMessage}
domain: ${values.domain}
category: ${values.category}
---

# ${values.name}

## 指令说明
${values.description}

## 对话流程
${values.conversationFlow}

## 评测标准
${values.evaluationCriteria}

## 记忆保存
完成后自动保存到: 领域/${values.domain}/${values.name}记忆.md
`;

        // 保存指令文件
        const response = await fetch(`${API_BASE_URL}/api/save-instruction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: values.name,
            content: instructionContent,
            domain: values.domain
          })
        });

        if (response.ok) {
          message.success('指令创建成功！');
          setShowCreateInstructionModal(false);
          form.resetFields();
          loadInstructions(); // 刷新指令列表
        } else {
          throw new Error('保存失败');
        }
      } catch (error) {
        message.error('创建指令失败: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    return (
      <Modal
        title="🎯 创建新指令"
        open={showCreateInstructionModal}
        onCancel={() => setShowCreateInstructionModal(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          onValuesChange={checkSensitiveWords}
        >
          {/* 敏感词提醒浮窗 */}
          {sensitiveWordsDetected.length > 0 && (
            <Alert
              message="⚠️ 检测到敏感词汇"
              description={
                <div>
                  <p>以下词汇可能被Q CLI拒绝，建议替换：</p>
                  {sensitiveWordsDetected.map((item, index) => (
                    <div key={index} style={{ marginBottom: 8 }}>
                      <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>"{item.word}"</span>
                      <span> → 建议改为：</span>
                      <span style={{ color: '#52c41a', fontWeight: 'bold' }}>"{item.suggestion}"</span>
                      <span style={{ color: '#666', fontSize: '12px' }}> (字段：{item.field})</span>
                    </div>
                  ))}
                  <Button 
                    type="primary" 
                    size="small" 
                    onClick={replaceSensitiveWords}
                    style={{ marginTop: 8 }}
                  >
                    🔄 一键替换所有敏感词
                  </Button>
                </div>
              }
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Form.Item
            name="name"
            label="指令名称"
            rules={[{ required: true, message: '请输入指令名称' }]}
          >
            <Input 
              placeholder="示例：AI修仙老祖" 
              style={{ 
                color: '#999',
                borderColor: sensitiveWordsDetected.some(d => d.field === 'name') ? '#ff4d4f' : undefined
              }} 
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="指令描述"
            rules={[{ required: true, message: '请输入指令描述' }]}
          >
            <Input 
              placeholder="示例：AI修仙宗门老祖境界评测指令" 
              style={{ 
                color: '#999',
                borderColor: sensitiveWordsDetected.some(d => d.field === 'description') ? '#ff4d4f' : undefined
              }} 
            />
          </Form.Item>

          <Form.Item
            name="icon"
            label="图标"
            rules={[{ required: true, message: '请选择图标' }]}
          >
            <Select placeholder="示例：🧙♂️ 选择合适的emoji图标">
              <Select.Option value="🏥">🏥 医疗健康</Select.Option>
              <Select.Option value="💰">💰 财务管理</Select.Option>
              <Select.Option value="📚">📚 学习教育</Select.Option>
              <Select.Option value="🎯">🎯 目标规划</Select.Option>
              <Select.Option value="🧘">🧘 心理咨询</Select.Option>
              <Select.Option value="🍳">🍳 生活助手</Select.Option>
              <Select.Option value="💼">💼 职业发展</Select.Option>
              <Select.Option value="🧙♂️">🧙♂️ AI能力</Select.Option>
              <Select.Option value="💪">💪 健身教练</Select.Option>
              <Select.Option value="🩺">🩺 健康评估</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="triggerMessage"
            label="触发消息"
            rules={[{ required: true, message: '请输入触发消息' }]}
          >
            <Input placeholder="示例：老祖（简短易记的触发词）" style={{ color: '#999' }} />
          </Form.Item>

          <Form.Item
            name="domain"
            label="领域分类"
            rules={[{ required: true, message: '请选择领域' }]}
          >
            <Select placeholder="示例：能力管理">
              <Select.Option value="健康管理">健康管理</Select.Option>
              <Select.Option value="财务管理">财务管理</Select.Option>
              <Select.Option value="学习成长">学习成长</Select.Option>
              <Select.Option value="生活助手">生活助手</Select.Option>
              <Select.Option value="职业发展">职业发展</Select.Option>
              <Select.Option value="能力管理">能力管理</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="conversationFlow"
            label="对话流程"
            rules={[{ required: true, message: '请描述对话流程' }]}
          >
            <Input.TextArea 
              rows={6}
              placeholder="示例流程：&#10;1. 强制读取记忆和配置文件&#10;2. 确定当前状态和考核问题&#10;3. 沉浸式开场（包含角色设定）&#10;4. 严格按序提问（一次一个问题）&#10;5. 深度点评每个回答&#10;6. 完整评定和指导建议&#10;7. 更新记忆文件"
              style={{ 
                color: '#999',
                borderColor: sensitiveWordsDetected.some(d => d.field === 'conversationFlow') ? '#ff4d4f' : undefined
              }}
            />
          </Form.Item>

          <Form.Item
            name="evaluationCriteria"
            label="评测标准"
            rules={[{ required: true, message: '请描述评测标准' }]}
          >
            <Input.TextArea 
              rows={4}
              placeholder="示例标准：&#10;- 基础能力考察（工具使用经验）&#10;- 实践应用水平（具体项目案例）&#10;- 思维深度评估（问题分析能力）&#10;- 学习成长潜力（持续改进意识）"
              style={{ 
                color: '#999',
                borderColor: sensitiveWordsDetected.some(d => d.field === 'evaluationCriteria') ? '#ff4d4f' : undefined
              }}
            />
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowCreateInstructionModal(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                创建指令
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    );
  };

  // 设置面板组件
  const SettingsPanel = () => {
    return (
      <div style={{ padding: 24, height: "100vh", overflow: "auto" }}>
        <Card title="系统设置">
          <Form layout="vertical">
            <Form.Item label="Q CLI状态">
              <div>
                状态: {qCliStatus.available ? '✅ 可用' : '❌ 不可用'}
                {qCliStatus.available && <div>活跃会话: {qCliStatus.sessions}</div>}
              </div>
              <Button type="default" size="small" onClick={checkQCliStatus} style={{ marginTop: 8 }}>
                检查状态
              </Button>
            </Form.Item>
            
            <Form.Item label="系统信息">
              <div style={{ backgroundColor: "#f5f5f5", padding: 16, borderRadius: 6 }}>
                <h4>AI私人助理 v2.0.0</h4>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li>指令：{instructions.length} 个</li>
                  <li>记忆：{memories.length} 条</li>
                  <li>对话：{messages.length} 条</li>
                </ul>
              </div>
            </Form.Item>
          </Form>
        </Card>
      </div>
    );
  };

  // 渲染内容
  const renderContent = () => {
    console.log('当前标签页:', currentTab);
    switch (currentTab) {
      case 'chat': return (
        <ChatPanel 
          messages={messages}
          handleSendMessage={handleSendMessage}
          qCliStatus={qCliStatus}
          memories={memories}
          laoziSession={laoziSession}
          exitLaoziMode={exitLaoziMode}
        />
      );
      case 'memory': return <MemoryLibrary />;
      case 'workflow': return <WorkflowPanel />;
      case 'settings': return <SettingsPanel />;
      case 'logs': 
        console.log('渲染日志页面');
        return <LogsPanel />;
      default: return (
        <ChatPanel 
          messages={messages}
          handleSendMessage={handleSendMessage}
          qCliStatus={qCliStatus}
          memories={memories}
          laoziSession={laoziSession}
          exitLaoziMode={exitLaoziMode}
        />
      );
    }
  };

  return (
    <Layout style={{ height: "100vh" }}>
      <Sider width={280} style={{ background: '#fff', boxShadow: '2px 0 8px rgba(0,0,0,0.1)' }}>
        <div style={{ 
          padding: '24px 20px', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          color: 'white', 
          fontSize: '20px', 
          fontWeight: 'bold',
          textAlign: 'center',
          borderRadius: '0 0 16px 16px',
          margin: '0 8px 16px 8px'
        }}>
          AI私人助理
        </div>
        <Menu
          mode="inline"
          selectedKeys={[currentTab]}
          style={{ 
            border: 'none',
            padding: '0 12px'
          }}
          items={[
            {
              key: "chat",
              icon: <MessageOutlined style={{ fontSize: '18px', color: '#1890ff' }} />,
              label: (
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: currentTab === 'chat' ? 'bold' : 'normal',
                  marginLeft: '8px'
                }}>
                  智能对话
                </span>
              ),
              style: {
                height: '56px',
                lineHeight: '56px',
                margin: '8px 0',
                borderRadius: '12px',
                backgroundColor: currentTab === 'chat' ? '#e6f7ff' : 'transparent',
                border: currentTab === 'chat' ? '2px solid #1890ff' : '2px solid transparent'
              },
              onClick: () => switchToTab("chat")
            },
            {
              key: "memory",
              icon: <DatabaseOutlined style={{ fontSize: '18px', color: '#52c41a' }} />,
              label: (
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: currentTab === 'memory' ? 'bold' : 'normal',
                  marginLeft: '8px'
                }}>
                  记忆库
                </span>
              ),
              style: {
                height: '56px',
                lineHeight: '56px',
                margin: '8px 0',
                borderRadius: '12px',
                backgroundColor: currentTab === 'memory' ? '#f6ffed' : 'transparent',
                border: currentTab === 'memory' ? '2px solid #52c41a' : '2px solid transparent'
              },
              onClick: () => switchToTab("memory")
            },
            {
              key: "workflow",
              icon: <AppstoreOutlined style={{ fontSize: '18px', color: '#fa8c16' }} />,
              label: (
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: currentTab === 'workflow' ? 'bold' : 'normal',
                  marginLeft: '8px'
                }}>
                  智能指令
                </span>
              ),
              style: {
                height: '56px',
                lineHeight: '56px',
                margin: '8px 0',
                borderRadius: '12px',
                backgroundColor: currentTab === 'workflow' ? '#fff7e6' : 'transparent',
                border: currentTab === 'workflow' ? '2px solid #fa8c16' : '2px solid transparent'
              },
              onClick: () => switchToTab("workflow")
            },
            {
              key: "logs",
              icon: <InfoCircleOutlined style={{ fontSize: '18px', color: '#13c2c2' }} />,
              label: (
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: currentTab === 'logs' ? 'bold' : 'normal',
                  marginLeft: '8px'
                }}>
                  后台日志
                </span>
              ),
              style: {
                height: '56px',
                lineHeight: '56px',
                margin: '8px 0',
                borderRadius: '12px',
                backgroundColor: currentTab === 'logs' ? '#e6fffb' : 'transparent',
                border: currentTab === 'logs' ? '2px solid #13c2c2' : '2px solid transparent'
              },
              onClick: () => switchToTab("logs")
            },
            {
              key: "settings",
              icon: <SettingOutlined style={{ fontSize: '18px', color: '#722ed1' }} />,
              label: (
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: currentTab === 'settings' ? 'bold' : 'normal',
                  marginLeft: '8px'
                }}>
                  系统设置
                </span>
              ),
              style: {
                height: '56px',
                lineHeight: '56px',
                margin: '8px 0',
                borderRadius: '12px',
                backgroundColor: currentTab === 'settings' ? '#f9f0ff' : 'transparent',
                border: currentTab === 'settings' ? '2px solid #722ed1' : '2px solid transparent'
              },
              onClick: () => switchToTab("settings")
            }
          ]}
        />
        
        {/* 老祖模式状态显示 */}
        {laoziSession && (
          <div style={{ 
            margin: '20px 12px',
            padding: '16px',
            background: 'linear-gradient(135deg, #ffd89b 0%, #19547b 100%)',
            borderRadius: '12px',
            color: 'white',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
              🧙‍♂️ 老祖模式
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>
              进度: {laoziSession.progress}
            </div>
            <Button 
              size="small" 
              style={{ 
                marginTop: '12px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                borderRadius: '8px'
              }}
              onClick={exitLaoziMode}
            >
              退出老祖
            </Button>
          </div>
        )}
      </Sider>
      <Layout>
        <Content style={{ height: "100vh", overflow: "hidden" }}>
          {renderContent()}
          <CreateInstructionModal />
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
