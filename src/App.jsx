import React, { useState, useEffect, useRef } from "react";
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
} from "antd";
import {
  MessageOutlined,
  DatabaseOutlined,
  AppstoreOutlined,
  SettingOutlined,
  SendOutlined,
  PlusOutlined,
  DeleteOutlined,
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
  EyeOutlined,
} from "@ant-design/icons";

const { Header, Sider, Content } = Layout;
const { TextArea } = Input;
const { Text } = Typography;
const { Option } = Select;

function App() {
  const [currentTab, setCurrentTab] = useState("chat");
  const [logs, setLogs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatScrollPosition, setChatScrollPosition] = useState(0); // 保存聊天页面滚动位置
  const [memories, setMemories] = useState([]);
  const [personalMemories, setPersonalMemories] = useState([]);
  const [instructionMemories, setInstructionMemories] = useState([]);
  const [memoryViewType, setMemoryViewType] = useState('all');
  const [autoRefreshLogs, setAutoRefreshLogs] = useState(false); // 'all', 'personal', 'instruction'
  const [selectedMemories, setSelectedMemories] = useState([]);
  const [workflows, setWorkflows] = useState([]);
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
      const response = await fetch(`${API_BASE_URL}/api/instructions`);
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

  // 保存和恢复聊天滚动位置
  const saveChatScrollPosition = () => {
    const scrollContainer = document.querySelector('[data-chat-scroll-container]');
    if (scrollContainer) {
      setChatScrollPosition(scrollContainer.scrollTop);
    }
  };

  const restoreChatScrollPosition = () => {
    const scrollContainer = document.querySelector('[data-chat-scroll-container]');
    if (scrollContainer) {
      // 直接恢复到离开时的位置，不使用动画
      scrollContainer.scrollTop = chatScrollPosition;
    }
  };

  // 监听页面切换 - 只负责恢复位置
  useEffect(() => {
    if (currentTab === 'chat') {
      // 只在没有新消息时恢复滚动位置
      const hasRecentMessage = messages.length > 0 && 
        (new Date() - new Date(messages[messages.length - 1].timestamp)) < 5000;
      
      if (!hasRecentMessage) {
        restoreChatScrollPosition();
      }
    }
  }, [currentTab]);

  // 智能滚动到底部 - 聊天应用的默认行为
  const scrollToBottom = (force = false) => {
    if (currentTab !== 'chat') return;
    
    const scrollContainer = document.querySelector('[data-chat-scroll-container]');
    if (!scrollContainer) return;
    
    // 检查用户是否在明显查看历史消息（距离底部超过200px）
    const distanceFromBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight;
    const isViewingHistory = distanceFromBottom > 200;
    
    // 强制滚动或用户不在查看历史时才滚动
    if (force || !isViewingHistory) {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth'
      });
      // 清除保存的滚动位置，因为我们已经滚动到底部
      setChatScrollPosition(scrollContainer.scrollHeight);
    }
  };

  // 监听消息变化 - 只在有新消息且当前在聊天页面时滚动
  useEffect(() => {
    if (currentTab === 'chat' && messages.length > 0) {
      // 检查是否是真正的新消息（避免页面切换时触发）
      const lastMessage = messages[messages.length - 1];
      const now = new Date();
      const messageTime = new Date(lastMessage.timestamp);
      const isRecentMessage = (now - messageTime) < 2000; // 2秒内的消息
      
      if (isRecentMessage) {
        // 只有真正的新消息才滚动
        setTimeout(() => scrollToBottom(true), 100);
      }
    }
  }, [messages, currentTab]);

  // 处理发送消息
  const handleSendMessage = async (text) => {
    if (!text?.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    
    // 发送用户消息后立即滚动到底部
    setTimeout(() => scrollToBottom(true), 50);

    const loadingMessage = {
      id: Date.now() + 1,
      type: "ai",
      content: "正在思考中...",
      timestamp: new Date().toISOString(),
      loading: true,
    };
    setMessages(prev => [...prev, loadingMessage]);
    
    // 显示loading消息后平滑滚动到底部
    setTimeout(() => scrollToBottom(true), 150);

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
                references: result.actuallyUsedMemories // 使用实际使用的记忆
              }
            : msg
        )
      );
      
      // AI回复完成后滚动到最新消息
      setTimeout(() => scrollToBottom(false), 150);

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

  // 切换到聊天页面的函数
  const switchToChat = () => {
    setCurrentTab("chat");
  };

  // 切换到其他页面的函数
  const switchToOtherTab = (tabName) => {
    // 如果当前在聊天页面，先保存滚动位置
    if (currentTab === 'chat') {
      saveChatScrollPosition();
    }
    setCurrentTab(tabName);
  };

  // 执行指令
  const executeInstruction = (instruction) => {
    switchToChat();
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

  // 聊天面板组件
  const ChatPanel = () => {
    const [inputText, setInputText] = useState("");
    
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
          data-chat-scroll-container 
          style={{ 
            flex: 1,
            overflow: "auto", 
            padding: 24,
            scrollBehavior: "auto", // 移除平滑滚动，使用瞬间定位
            overflowAnchor: "auto" // 防止滚动锚点问题
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
            split={false} // 移除分割线，减少重绘
            renderItem={(message) => (
              <List.Item
                key={message.id} // 稳定的key避免重新渲染
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
              placeholder="💬 输入您的问题，我来为您解答..."
              autoSize={{ minRows: 1, maxRows: 4 }}
              style={{
                flex: 1,
                borderRadius: "16px",
                border: "2px solid #e6f7ff",
                fontSize: "15px",
                padding: "12px 16px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                transition: "all 0.3s ease"
              }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              disabled={!inputText.trim()}
              style={{
                height: "48px",
                borderRadius: "16px",
                background: "#667eea",
                border: "none",
                boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                fontSize: "16px",
                fontWeight: "bold",
                minWidth: "80px"
              }}
            >
              发送
            </Button>
          </div>
          <div style={{ 
            marginTop: "8px", 
            fontSize: "12px", 
            color: "#999",
            textAlign: "center"
          }}>
            💡 按 Enter 发送，Shift + Enter 换行
          </div>
        </div>
      </div>
    );
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
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        onClick={() => executeInstruction(instruction)}
                        style={{ width: '100%' }}
                      >
                        启动指令
                      </Button>
                    ]}
                  >
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

  // 创建指令模态框组件
  const CreateInstructionModal = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

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
        >
          <Form.Item
            name="name"
            label="指令名称"
            rules={[{ required: true, message: '请输入指令名称' }]}
          >
            <Input placeholder="例如：健康管理师" />
          </Form.Item>

          <Form.Item
            name="description"
            label="指令描述"
            rules={[{ required: true, message: '请输入指令描述' }]}
          >
            <Input placeholder="例如：专业的健康管理和生活指导" />
          </Form.Item>

          <Form.Item
            name="icon"
            label="图标"
            rules={[{ required: true, message: '请选择图标' }]}
          >
            <Select placeholder="选择图标">
              <Select.Option value="🏥">🏥 医疗健康</Select.Option>
              <Select.Option value="💰">💰 财务管理</Select.Option>
              <Select.Option value="📚">📚 学习教育</Select.Option>
              <Select.Option value="🎯">🎯 目标规划</Select.Option>
              <Select.Option value="🧘">🧘 心理咨询</Select.Option>
              <Select.Option value="🍳">🍳 生活助手</Select.Option>
              <Select.Option value="💼">💼 职业发展</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="triggerMessage"
            label="触发消息"
            rules={[{ required: true, message: '请输入触发消息' }]}
          >
            <Input placeholder="例如：我要健康管理" />
          </Form.Item>

          <Form.Item
            name="domain"
            label="领域分类"
            rules={[{ required: true, message: '请选择领域' }]}
          >
            <Select placeholder="选择领域">
              <Select.Option value="健康管理">健康管理</Select.Option>
              <Select.Option value="财务管理">财务管理</Select.Option>
              <Select.Option value="学习成长">学习成长</Select.Option>
              <Select.Option value="生活助手">生活助手</Select.Option>
              <Select.Option value="职业发展">职业发展</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="conversationFlow"
            label="对话流程"
            rules={[{ required: true, message: '请描述对话流程' }]}
          >
            <Input.TextArea 
              rows={4}
              placeholder="描述指令的对话流程，例如：&#10;1. 询问用户基本健康状况&#10;2. 了解生活习惯和饮食偏好&#10;3. 制定个性化健康计划&#10;4. 提供持续跟踪建议"
            />
          </Form.Item>

          <Form.Item
            name="evaluationCriteria"
            label="评测标准"
            rules={[{ required: true, message: '请描述评测标准' }]}
          >
            <Input.TextArea 
              rows={3}
              placeholder="描述如何评估用户状态，例如：&#10;- 健康意识水平&#10;- 生活习惯规律性&#10;- 改善意愿强度"
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
      case 'chat': return <ChatPanel />;
      case 'memory': return <MemoryLibrary />;
      case 'workflow': return <WorkflowPanel />;
      case 'settings': return <SettingsPanel />;
      case 'logs': 
        console.log('渲染日志页面');
        return <LogsPanel />;
      default: return <ChatPanel />;
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
              onClick: () => switchToChat()
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
              onClick: () => switchToOtherTab("memory")
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
              onClick: () => switchToOtherTab("workflow")
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
              onClick: () => switchToOtherTab("logs")
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
              onClick: () => switchToOtherTab("settings")
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
