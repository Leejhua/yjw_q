import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  const [memories, setMemories] = useState([]);
  const [selectedMemories, setSelectedMemories] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [apiKey, setApiKey] = useState("");
  const [qCliStatus, setQCliStatus] = useState({ available: false, sessions: 0 });
  const [instructions, setInstructions] = useState([]);
  const [instructionsLoading, setInstructionsLoading] = useState(false);
  const [laoziSession, setLaoziSession] = useState(null);

  // 检查Q CLI状态
  const checkQCliStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/q-status');
      if (response.ok) {
        const status = await response.json();
        setQCliStatus(status);
        return status.available;
      }
    } catch (error) {
      console.error('检查Q CLI状态失败:', error);
      setQCliStatus({ available: false, sessions: 0 });
    }
    return false;
  };

  // 加载记忆文件
  useEffect(() => {
    const loadPersonalMemories = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/memories');
        if (response.ok) {
          const loadedMemories = await response.json();
          setMemories(loadedMemories);
          addLog("success", "记忆库加载完成", `共加载 ${loadedMemories.length} 条记忆`);
        }
      } catch (error) {
        console.error('读取记忆失败:', error);
        addLog("error", "记忆库加载失败", error.message);
      }
    };
    
    loadPersonalMemories();
    loadInstructions();
    loadLaoziSession();
    checkQCliStatus();
  }, []);

  // 加载指令列表
  const loadInstructions = async () => {
    setInstructionsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/instructions');
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
      const response = await fetch('http://localhost:3001/api/laozi-session/default');
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

  // 滚动到底部
  const scrollToBottom = () => {
    if (currentTab !== 'chat') return;
    
    requestAnimationFrame(() => {
      const scrollContainer = document.querySelector('[data-chat-scroll-container]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    });
  };

  useEffect(() => {
    if (currentTab === 'chat' && messages.length > 0) {
      scrollToBottom();
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
      const aiResponse = await generateAIResponse(text, relevantMemories);

      setMessages(prev =>
        prev.map(msg =>
          msg.id === loadingMessage.id
            ? { ...msg, content: aiResponse, loading: false, references: relevantMemories }
            : msg
        )
      );

      // 检测老祖会话状态变化
      if (aiResponse.includes('AI修仙老祖评测已完成')) {
        setLaoziSession(null);
      } else if (aiResponse.includes('老祖') || aiResponse.includes('弟子')) {
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
    
    const isAvailable = await checkQCliStatus();
    if (!isAvailable) {
      throw new Error("Amazon Q CLI不可用，请确保已正确安装和配置");
    }
    
    return await chatWithQCli(userMessage, relevantMemories);
  };

  // Q CLI对话
  const chatWithQCli = async (userMessage, relevantMemories) => {
    try {
      const response = await fetch('http://localhost:3001/api/chat-with-q', {
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
          await fetch('http://localhost:3001/api/memories/refresh', { method: 'POST' });
          const memResponse = await fetch('http://localhost:3001/api/memories');
          if (memResponse.ok) {
            const updatedMemories = await memResponse.json();
            setMemories(updatedMemories);
          }
        } catch (refreshError) {
          console.error('刷新记忆库失败:', refreshError);
        }
      }
      
      return data.response;
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

  // 执行指令
  const executeInstruction = (instruction) => {
    setCurrentTab("chat");
    setTimeout(() => {
      handleSendMessage(instruction.triggerMessage);
    }, 200);
    message.success(`正在启动指令：${instruction.name}`);
  };

  // 退出老祖模式
  const exitLaoziMode = async () => {
    try {
      setCurrentTab("chat");
      setTimeout(() => {
        handleSendMessage("退出老祖");
        setTimeout(() => setLaoziSession(null), 1000);
      }, 200);
      message.success('正在退出老祖模式...');
    } catch (error) {
      console.error('退出老祖模式失败:', error);
      message.error('退出失败');
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
        <div 
          data-chat-scroll-container 
          style={{ 
            flex: 1,
            overflow: "auto", 
            padding: 24,
            scrollBehavior: "smooth"
          }}
        >
          {laoziSession && !laoziSession.isCompleted && (
            <Alert
              message="🧙♂️ 老祖评测模式进行中"
              description={`当前进度：第${laoziSession.currentQuestion}问 (${laoziSession.progress})`}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              action={<Button size="small" onClick={exitLaoziMode}>退出</Button>}
            />
          )}
          
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
            renderItem={(message) => (
              <List.Item
                style={{
                  padding: "12px 0",
                  borderBottom: "none",
                  display: "flex",
                  justifyContent: message.type === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "70%",
                    padding: "12px 16px",
                    borderRadius: 12,
                    backgroundColor: message.type === "user" ? "#1890ff" : "#f0f0f0",
                    color: message.type === "user" ? "white" : "black",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {message.loading ? (
                    <Spin indicator={<LoadingOutlined spin />} />
                  ) : (
                    <div>
                      {message.content}
                      {message.references && message.references.length > 0 && (
                        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                          <strong>相关记忆：</strong>
                          {message.references.map((ref) => ref.category).join(", ")}
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                    {new Date(message.timestamp).toLocaleString("zh-CN")}
                  </div>
                </div>
              </List.Item>
            )}
          />
        </div>

        <div style={{ padding: 16, borderTop: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <Input.TextArea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息，按 Enter 发送，Shift+Enter 换行..."
              autoSize={{ minRows: 1, maxRows: 4 }}
              style={{ flex: 1 }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              disabled={!inputText.trim()}
            >
              发送
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // 记忆库组件
  const MemoryLibrary = () => {
    return (
      <div style={{ padding: 24, height: "100vh", overflow: "auto" }}>
        <Card title="记忆库">
          {memories.length === 0 ? (
            <Empty description="记忆库为空" />
          ) : (
            <List
              dataSource={memories}
              renderItem={(memory) => (
                <List.Item style={{ padding: '16px', border: '1px solid #f0f0f0', borderRadius: '8px', marginBottom: '12px' }}>
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Text strong style={{ fontSize: '16px', flex: 1 }}>
                        {memory.title || '无标题'}
                      </Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {new Date(memory.timestamp).toLocaleString("zh-CN")}
                      </Text>
                      <Tag color="blue">{memory.category}</Tag>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <Text style={{ color: '#999', fontSize: '13px' }}>
                        {memory.content.length > 100 
                          ? `${memory.content.substring(0, 100)}...` 
                          : memory.content}
                      </Text>
                    </div>
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
            <Button icon={<ReloadOutlined />} onClick={loadInstructions} loading={instructionsLoading}>
              刷新
            </Button>
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

  // 日志面板组件
  const LogsPanel = () => {
    return (
      <div style={{ padding: 24, height: "100vh", overflow: "auto" }}>
        <Card title="运行日志">
          {logs.length === 0 ? (
            <Empty description="暂无日志记录" />
          ) : (
            <div style={{ maxHeight: "calc(100vh - 200px)", overflow: "auto" }}>
              {logs.map((log, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: 12,
                    padding: 12,
                    borderLeft: `4px solid ${
                      log.type === "success" ? "#52c41a" :
                      log.type === "error" ? "#ff4d4f" :
                      log.type === "warning" ? "#faad14" : "#1890ff"
                    }`,
                    backgroundColor: "#f5f5f5",
                    borderRadius: 4,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Text strong>{log.message}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {log.timestamp}
                    </Text>
                  </div>
                  {log.details && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                      {log.details}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  };

  // 渲染内容
  const renderContent = () => {
    switch (currentTab) {
      case 'chat': return <ChatPanel />;
      case 'memory': return <MemoryLibrary />;
      case 'workflow': return <WorkflowPanel />;
      case 'settings': return <SettingsPanel />;
      case 'logs': return <LogsPanel />;
      default: return <ChatPanel />;
    }
  };

  return (
    <Layout style={{ height: "100vh" }}>
      <Sider width={250} theme="light">
        <div style={{ padding: 16, fontWeight: 500 }}>AI私人助理</div>
        <Menu
          mode="inline"
          selectedKeys={[currentTab]}
          items={[
            { key: "chat", icon: <MessageOutlined />, label: "对话", onClick: () => setCurrentTab("chat") },
            { key: "memory", icon: <DatabaseOutlined />, label: "记忆库", onClick: () => setCurrentTab("memory") },
            { key: "workflow", icon: <AppstoreOutlined />, label: "指令", onClick: () => setCurrentTab("workflow") },
            { key: "settings", icon: <SettingOutlined />, label: "设置", onClick: () => setCurrentTab("settings") },
            { key: "logs", icon: <InfoCircleOutlined />, label: "运行日志", onClick: () => setCurrentTab("logs") },
          ]}
        />
      </Sider>
      <Layout>
        <Content style={{ height: "100vh", overflow: "hidden" }}>
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
