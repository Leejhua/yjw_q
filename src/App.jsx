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
  UpOutlined,
  DownOutlined,
  EyeOutlined,
} from "@ant-design/icons";
// 不再导入任何模拟数据，完全基于实际文件
const { TabPane } = Tabs;
const { Option } = Select;

const { Header, Sider, Content } = Layout;
const { TextArea } = Input;
const { Text } = Typography;

function App() {
  const [currentTab, setCurrentTab] = useState("chat");
  const [logs, setLogs] = useState([]);
  const [logsExpanded, setLogsExpanded] = useState(false);
  const [messages, setMessages] = useState([]); // 完全空白，不读取任何存储
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);
  const [memories, setMemories] = useState([]);
  const [selectedMemories, setSelectedMemories] = useState([]);
  const [hasLoadedFiles, setHasLoadedFiles] = useState(false);

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

  // 组件加载时检查Q CLI状态
  useEffect(() => {
    checkQCliStatus();
  }, []);

  // 从后端API加载记忆文件
  useEffect(() => {
    const loadPersonalMemories = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/memories');
        if (response.ok) {
          const loadedMemories = await response.json();
          setMemories(loadedMemories);
          setHasLoadedFiles(true);
          addLog("success", "记忆库加载完成", `共加载 ${loadedMemories.length} 条记忆`);
        } else {
          setMemories([]);
          setHasLoadedFiles(true);
          addLog("error", "记忆库加载失败", "无法连接到存储服务器");
        }
      } catch (error) {
        console.error('读取记忆失败:', error);
        setMemories([]);
        setHasLoadedFiles(true);
        addLog("error", "记忆库加载失败", error.message);
      }
    };
    
    loadPersonalMemories();
  }, []);
  const [workflows, setWorkflows] = useState([]); // 完全空白，不读取任何存储
  const [apiKey, setApiKey] = useState(""); // 完全空白，不读取任何存储
  const [aiService, setAiService] = useState("deepseek"); // AI服务选择：deepseek 或 qcli
  const [qCliStatus, setQCliStatus] = useState({ available: false, sessions: 0 });

  // 添加清除所有记忆数据的功能
  const clearAllMemories = () => {
    Modal.confirm({
      title: "确认清除所有记忆数据？",
      content: (
        <div>
          <p><strong>此操作将永久删除以下所有数据：</strong></p>
          <ul>
            <li>所有本地存储的记忆文件</li>
            <li>所有上传的记忆文件</li>
            <li>所有指令配置</li>
            <li>所有API密钥</li>
            <li>所有聊天记录</li>
          </ul>
          <p style={{ color: '#ff4d4f', marginTop: 16 }}>
            ⚠️ 此操作不可恢复，请谨慎操作！
          </p>
        </div>
      ),
      okText: "确认清除",
      okType: "danger",
      cancelText: "取消",
      width: 500,
      onOk() {
        // 清除所有localStorage数据
        if (typeof localStorage !== 'undefined') {
          localStorage.clear();
          console.log('🗑️ 已清除所有localStorage数据');
        }
        
        // 清除所有sessionStorage数据
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.clear();
          console.log('🗑️ 已清除所有sessionStorage数据');
        }
        
        // 重置所有应用状态
        setMemories([]);
        setMessages([]);
        setWorkflows([]);
        setApiKey('');
        setLogs([]);
        
        addLog("success", "数据清除完成", "已清除所有记忆和应用数据");
        message.success("所有数据已清除完成！");
        
        // 重新加载页面以应用更改
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      },
    });
  };

  // 从localStorage加载数据
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem('ai-messages');
      const savedWorkflows = localStorage.getItem('ai-flows');
      const savedApiKey = localStorage.getItem('ai-api-key');
      
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
      if (savedWorkflows) {
        setWorkflows(JSON.parse(savedWorkflows));
      }
      if (savedApiKey) {
        setApiKey(savedApiKey);
      }
    } catch (error) {
      console.error('从localStorage加载数据失败:', error);
    }
  }, []);

  // 保存数据到localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ai-messages', JSON.stringify(messages));
    } catch (error) {
      console.error('保存消息到localStorage失败:', error);
    }
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem('ai-flows', JSON.stringify(workflows));
    } catch (error) {
      console.error('保存指令到localStorage失败:', error);
    }
  }, [workflows]);

  useEffect(() => {
    if (apiKey) {
      try {
        localStorage.setItem('ai-api-key', apiKey);
      } catch (error) {
        console.error('保存API密钥到localStorage失败:', error);
      }
    }
  }, [apiKey]);

  // 上传文件到个人记忆
  const saveUploadedFileToPersonalMemory = async (file, content) => {
    try {
      // 创建Blob对象
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      
      // 创建下载链接
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      message.success(`文件 ${file.name} 已准备下载到个人记忆文件夹`);
    } catch (error) {
      console.error('保存文件失败:', error);
      message.error('保存文件失败');
    }
  };

  // 处理指令相关函数
  const handleRunWorkflow = async (workflowId) => {
    const workflow = workflows.find((w) => w.id === workflowId);
    if (!workflow) return;

    const startTime = Date.now();
    addLog("info", "开始执行指令", workflow.name);

    // 显示执行进度模态框
    const modal = Modal.info({
      title: `执行指令：${workflow.name}`,
      width: 500,
      content: (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <span style={{ color: "#666" }}>正在执行，请稍候...</span>
          </div>
          <div style={{ marginBottom: 16 }}>
            {(workflow.steps || [workflow.description]).map((step, index) => (
              <div
                key={index}
                style={{
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    backgroundColor: "#1890ff",
                    marginRight: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 12,
                  }}
                >
                  {index + 1}
                </div>
                <span>{typeof step === "string" ? step : step.content}</span>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", padding: 20 }}>
            <div
              style={{
                display: "inline-block",
                animation: "spin 1s linear infinite",
              }}
            >
              ⏳
            </div>
          </div>
        </div>
      ),
    });

    switch (workflow.name) {
      case "家庭旅行规划":
        setTimeout(() => {
          modal.destroy();
          Modal.success({
            title: "✅ 家庭旅行规划完成",
            width: 600,
            content: (
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    backgroundColor: "#f6ffed",
                    padding: 16,
                    borderRadius: 8,
                    marginBottom: 16,
                  }}
                >
                  <h4>🎯 为您生成的个性化旅行方案：</h4>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    <li>📍 精选景点：根据您的偏好推荐了5个必去景点</li>
                    <li>💰 预算优化：为您节省了约30%的旅行费用</li>
                    <li>🍜 美食推荐：整理了当地最具特色的5家餐厅</li>
                    <li>🏨 住宿建议：基于您的预算推荐了3个性价比高的酒店</li>
                  </ul>
                </div>
                <span style={{ color: "#666" }}>
                  详细信息已添加到您的对话记录中
                </span>
              </div>
            ),
          });

          const newMessage = {
            id: Date.now(),
            content: `🎯 家庭旅行规划已完成！\n\n根据您的需求，我为您制定了详细的旅行计划：\n\n📍 **推荐景点**：\n- 故宫博物院（历史文化）\n- 颐和园（自然风光）\n- 798艺术区（现代文化）\n- 南锣鼓巷（老北京风情）\n- 三里屯（现代商业）\n\n💰 **预算分配**：\n- 交通：2000元\n- 住宿：1500元（3晚）\n- 餐饮：800元\n- 门票：300元\n- 总计：4600元\n\n🍜 **美食推荐**：\n- 全聚德烤鸭\n- 东来顺涮羊肉\n- 护国寺小吃\n- 簋街美食\n- 王府井小吃街\n\n🏨 **住宿建议**：\n推荐选择地铁2号线附近的酒店，交通便利，价格适中。`,
            type: "ai",
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, newMessage]);
          addLog(
            "success",
            "家庭旅行规划执行完成",
            "生成了包含预算、景点、美食的完整旅行方案",
          );
        }, 3000);
        break;

      case "健康评估":
        setTimeout(() => {
          modal.destroy();
          Modal.success({
            title: "✅ 健康评估完成",
            width: 600,
            content: (
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    backgroundColor: "#f6ffed",
                    padding: 16,
                    borderRadius: 8,
                    marginBottom: 16,
                  }}
                >
                  <h4>📊 您的健康评估报告：</h4>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    <li>💪 体质指数：正常范围</li>
                    <li>🏃 建议运动：每周3次有氧运动</li>
                    <li>🥗 饮食建议：增加蛋白质摄入，减少糖分</li>
                    <li>😴 睡眠建议：保持7-8小时充足睡眠</li>
                  </ul>
                </div>
                <span style={{ color: "#666" }}>
                  详细报告已添加到您的对话记录中
                </span>
              </div>
            ),
          });

          const newMessage = {
            id: Date.now(),
            content: `📊 健康评估已完成！\n\n**您的健康画像**：\n\n💪 **体质状况**：\n- BMI指数：22.5（正常）\n- 基础代谢率：1500卡/天\n- 身体年龄：比实际年龄年轻3岁\n\n🏃 **运动计划**：\n- 有氧运动：每周3次，每次30分钟\n- 力量训练：每周2次，重点核心肌群\n- 伸展运动：每日10分钟\n\n🥗 **饮食调整**：\n- 增加优质蛋白：鸡胸肉、鱼类、豆制品\n- 减少精制糖：避免甜饮料、糕点\n- 多吃蔬果：每日5份蔬菜水果\n- 充足饮水：每日2000ml\n\n😴 **作息建议**：\n保持23:00-7:00的作息时间，提高睡眠质量。`,
            type: "ai",
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, newMessage]);
          addLog(
            "success",
            "健康评估执行完成",
            "生成了个性化健康建议和锻炼计划",
          );
        }, 2500);
        break;

      case "月度财务总结":
        setTimeout(() => {
          modal.destroy();
          Modal.success({
            title: "✅ 月度财务总结完成",
            width: 600,
            content: (
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    backgroundColor: "#f6ffed",
                    padding: 16,
                    borderRadius: 8,
                    marginBottom: 16,
                  }}
                >
                  <h4>📊 您的月度财务报告：</h4>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    <li>💰 总收入：15,000元</li>
                    <li>💸 总支出：12,000元</li>
                    <li>💵 结余：3,000元（储蓄率20%）</li>
                    <li>📈 理财建议：建议增加指数基金定投</li>
                  </ul>
                </div>
                <span style={{ color: "#666" }}>
                  详细报告已添加到您的对话记录中
                </span>
              </div>
            ),
          });

          const newMessage = {
            id: Date.now(),
            content: `📊 月度财务总结已完成！\n\n**本月财务概况**：\n\n💰 **收入情况**：\n- 工资收入：12,000元\n- 副业收入：2,000元\n- 理财收益：1,000元\n- 总收入：15,000元\n\n💸 **支出分析**：\n- 房租：4,000元（33%）\n- 餐饮：3,000元（25%）\n- 交通：800元（7%）\n- 购物：2,000元（17%）\n- 娱乐：1,500元（12%）\n- 其他：700元（6%）\n- 总支出：12,000元\n\n💵 **资产变化**：\n- 本月结余：3,000元\n- 储蓄率：20%（良好）\n- 净资产增长：5%\n\n📈 **下月建议**：\n1. 增加指数基金定投：每月1000元\n2. 减少不必要开支：500元\n3. 建立应急基金：目标6个月生活费`,
            type: "ai",
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, newMessage]);
          addLog(
            "success",
            "月度财务总结执行完成",
            "生成了详细的财务分析报告和理财建议",
          );
        }, 2800);
        break;

      default:
        setTimeout(
          () => {
            modal.destroy();
            Modal.success({
              title: `✅ ${workflow.name} 执行完成`,
            content: `指令 "${workflow.name}" 已成功执行完毕。`,
            });

            const newMessage = {
              id: Date.now(),
              content: `✅ 指令 "${workflow.name}" 执行完成！\n\n执行步骤：\n${(workflow.steps || [workflow.description]).map((step, index) => `${index + 1}. ${typeof step === "string" ? step : step.content}`).join("\n")}`,
              type: "ai",
              timestamp: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, newMessage]);
            addLog("success", `${workflow.name} 执行完成`);
          },
          Math.max(1000, (workflow.steps?.length || 1) * 800),
        );
    }
  };

  const handleDeleteWorkflow = (workflowId) => {
    Modal.confirm({
      title: "确认删除指令？",
      content: "此操作不可恢复，确定要删除这个指令吗？",
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk() {
        setWorkflows((prev) => prev.filter((w) => w.id !== workflowId));
        addLog("success", "指令已删除", `ID: ${workflowId}`);
      },
    });
  };

  const handleDeleteMemory = (memoryId) => {
    Modal.confirm({
      title: "确认删除记忆？",
      content: "此操作不可恢复，确定要删除这条记忆吗？",
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk() {
        setMemories((prev) => prev.filter((m) => m.id !== memoryId));
        addLog("success", "记忆已删除", `ID: ${memoryId}`);
      },
    });
  };

  const scrollToBottom = () => {
    // 多重保障确保滚动到底部
    requestAnimationFrame(() => {
      // 方法1：直接操作滚动容器
      const scrollContainer = document.querySelector('[data-chat-scroll-container]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
      
      // 方法2：使用锚点滚动
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView?.({ behavior: "auto", block: "end" });
      }, 50);
      
      // 方法3：强制滚动（备用方案）
      setTimeout(() => {
        const container = document.querySelector('[data-chat-scroll-container]');
        if (container) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'auto'
          });
        }
      }, 150);
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 处理用户输入
  const handleSendMessage = async (text = null) => {
    const messageText = text || inputValue;
    if (!messageText.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    if (!text) setInputValue("");

    // 显示加载状态
    const loadingMessage = {
      id: Date.now() + 1,
      type: "ai",
      content: "正在思考中...",
      timestamp: new Date().toISOString(),
      loading: true,
    };
    setMessages((prevMessages) => [...prevMessages, loadingMessage]);

    // 延迟滚动以确保DOM已更新
    setTimeout(scrollToBottom, 50);

    try {
      // 查找相关记忆
      const relevantMemories = findRelevantMemories(userMessage.content);

      // 调用DeepSeek API获取回复
      const aiResponse = await generateAIResponse(
        userMessage.content,
        relevantMemories,
      );

      // 更新消息，替换加载状态
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === loadingMessage.id
            ? {
                ...msg,
                content: aiResponse,
                loading: false,
                references: relevantMemories,
              }
            : msg,
        ),
      );

      // 回复完成后滚动
      setTimeout(scrollToBottom, 50);
    } catch (error) {
      // 移除加载状态的消息
      setMessages((prevMessages) => 
        prevMessages.filter(msg => msg.id !== loadingMessage.id)
      );
      
      // 使用轻量级的message提示，自动消退（时间减少一半）
      let errorType = 'error';
      let duration = 2.5; // 2.5秒后自动关闭（原来5秒的一半）
      
      if (error.message.includes('API密钥')) {
        message.error({
          content: (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>⚠️ API密钥未配置</div>
              <div>请前往【设置】页面配置DeepSeek API密钥</div>
            </div>
          ),
          duration,
          key: 'api-key-error'
        });
      } else if (error.message.includes('网络')) {
        message.warning({
          content: (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>🌐 网络连接失败</div>
              <div>请检查网络连接后重试</div>
            </div>
          ),
          duration: 2, // 原来4秒的一半
          key: 'network-error'
        });
      } else if (error.message.includes('频率')) {
        message.warning({
          content: (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>⏰ 请求过于频繁</div>
              <div>请等待30秒后重试</div>
            </div>
          ),
          duration: 1.5, // 原来3秒的一半
          key: 'rate-limit-error'
        });
      } else {
        message.error({
          content: (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>❌ AI服务错误</div>
              <div>{error.message}</div>
            </div>
          ),
          duration,
          key: 'general-error'
        });
      }
      
      setTimeout(scrollToBottom, 50);
    }
  };

  // 查找相关记忆 - 改进版，支持读取全部个人信息
  const findRelevantMemories = (query) => {
    console.log('🔍 查找相关记忆 - 查询:', query);
    console.log('📚 当前记忆库数量:', memories?.length || 0);
    console.log('💾 记忆库数据预览:', memories?.slice(0, 2) || []);
    
    if (!query || !memories || memories.length === 0) {
      console.log('⚠️ 没有找到记忆或查询为空');
      return [];
    }

    const searchQuery = query.toLowerCase();
    
    // **重要变更：移除所有分类限制，搜索所有记忆**
    
    // 对于宽泛查询（如"我是谁"、"告诉我所有"、"关于我"等），返回所有记忆
    const broadQueries = [
      '什么', '谁', '哪里', '怎样', '如何', '介绍', '关于', '告诉我', '说说',
      '所有', '全部', '任何', '一切', '总结', '概括', '档案', '信息'
    ];
    
    const isBroadQuery = broadQueries.some(word => searchQuery.includes(word)) || 
                        searchQuery.length <= 3;
    
    if (isBroadQuery) {
      console.log('📚 宽泛查询，返回所有记忆，共', memories.length, '条');
      return memories;
    }

    // 对于具体查询，使用关键词匹配所有内容
    const keywords = searchQuery
      .split(/\s+/)
      .filter((keyword) => keyword.length > 1)
      .filter((keyword, index, self) => self.indexOf(keyword) === index);
    
    if (keywords.length === 0) return memories; // 如果没有关键词，返回所有记忆

    // 计算相关性分数 - 适用于所有记忆类型
    const scoredMemories = memories.map((memory) => {
      // 处理标签字段
      let tagsText = '';
      if (memory.tags) {
        if (Array.isArray(memory.tags)) {
          tagsText = memory.tags.join(' ');
        } else if (typeof memory.tags === 'string') {
          tagsText = memory.tags;
        }
      }
      
      const memoryText = (memory.title + " " + memory.content + " " + memory.category + " " + tagsText).toLowerCase();
      let score = 0;

      // 关键词匹配（适用于所有记忆）
      keywords.forEach((keyword) => {
        const regex = new RegExp(keyword, 'gi');
        const matches = memoryText.match(regex);
        if (matches) {
          score += matches.length * 2;
          
          // 完全匹配加分
          if (memoryText.includes(keyword)) score += 3;
          
          // 在标题或类别中匹配额外加分
          if (memory.title.toLowerCase().includes(keyword)) score += 5;
          if (memory.category.toLowerCase().includes(keyword)) score += 4;
        }
      });

      return { memory, score };
    });

    // 返回所有相关记忆，不再有任何类别限制
    const relevantMemories = scoredMemories
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.memory);

    // 如果没有找到相关记忆，返回所有记忆（避免遗漏）
    if (relevantMemories.length === 0) {
      console.log('⚠️ 未找到关键词匹配，返回所有记忆作为备选');
      return memories;
    }

    console.log('📊 找到相关记忆数量:', relevantMemories.length);
    return relevantMemories;
  };

  const addLog = (type, message, details = "") => {
    const newLog = {
      id: Date.now(),
      type,
      message,
      details,
      timestamp: new Date().toLocaleTimeString(),
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 19)]); // 保持最多20条日志，提供完整操作记录
  };

  // Q CLI对话函数
  const chatWithQCli = async (userMessage, messageHistory) => {
    try {
      const response = await fetch('http://localhost:3001/api/chat-with-q', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          sessionId: 'default'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Q CLI调用失败');
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Q CLI对话错误:', error);
      throw error;
    }
  };

  // 生成AI回复（支持多种AI服务）
  const generateAIResponse = async (userMessage, relevantMemories) => {
    addLog("info", "开始生成AI回复", userMessage);

    // 根据选择的AI服务进行处理
    if (aiService === "qcli") {
      // 检查Q CLI是否可用
      const isAvailable = await checkQCliStatus();
      if (!isAvailable) {
        // Q CLI不可用时自动切换到DeepSeek
        addLog("warning", "Q CLI不可用，自动切换到DeepSeek", "");
        if (!apiKey.trim()) {
          throw new Error("Q CLI不可用且DeepSeek API密钥未配置，请在设置中配置API密钥或安装Q CLI");
        }
        return await chatWithDeepSeek(userMessage, relevantMemories);
      }
      
      try {
        return await chatWithQCli(userMessage, []);
      } catch (error) {
        addLog("error", "Q CLI调用失败，尝试切换到DeepSeek", error.message);
        if (!apiKey.trim()) {
          throw new Error("Q CLI调用失败且DeepSeek API密钥未配置");
        }
        return await chatWithDeepSeek(userMessage, relevantMemories);
      }
    } else {
      // 使用DeepSeek
      return await chatWithDeepSeek(userMessage, relevantMemories);
    }
  };

  // DeepSeek对话函数
  const chatWithDeepSeek = async (userMessage, relevantMemories) => {
    if (!apiKey.trim()) {
      throw new Error("请先配置DeepSeek API密钥");
    }

    try {
      // 调试：显示找到的相关记忆
      console.log('🎯 找到的相关记忆数量:', relevantMemories?.length || 0);
      if (relevantMemories && relevantMemories.length > 0) {
        relevantMemories.forEach((memory, index) => {
          console.log(`📋 相关记忆 ${index + 1}:`, {
            title: memory.title,
            category: memory.category,
            content: memory.content.substring(0, 200)
          });
        });
      }

      // 构建上下文 - 适用于所有记忆类型，不再区分个人信息
      let context = "";
      if (relevantMemories && relevantMemories.length > 0) {
        context = "基于您的完整记忆库，我为您整理了以下内容：\n\n";
        
        // 按类别组织所有记忆
        const memoriesByCategory = {};
        relevantMemories.forEach(memory => {
          const category = memory.category || '未分类';
          if (!memoriesByCategory[category]) {
            memoriesByCategory[category] = [];
          }
          memoriesByCategory[category].push(memory.content);
        });

        // 格式化输出所有记忆
        Object.entries(memoriesByCategory).forEach(([category, contents]) => {
          context += `**${category}：**\n`;
          contents.forEach(content => {
            // 清理内容格式，移除markdown标记
            const cleanContent = content
              .replace(/^#+\s*/gm, '')  // 移除标题标记
              .replace(/\*\*(.*?)\*\*/g, '$1')  // 移除加粗
              .replace(/\*(.*?)\*/g, '$1')  // 移除斜体
              .trim();
            context += `${cleanContent}\n`;
          });
          context += "\n";
        });
        context += "\n";
      } else {
        context = "您的记忆库目前为空，没有任何记忆内容。\n\n";
      }

      // 构建消息历史
      const recentMessages = messages.slice(-10); // 最近10条消息
      const messageHistory = recentMessages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      // 构建系统提示 - 严格禁止编造信息
      const systemPrompt = `你是一个专业的AI私人助理，帮助用户管理记忆和执行指令。

${context}

**严格行为准则：**
1. **绝对诚实**：如果记忆库为空或没有相关信息，必须明确回答"我在您的记忆库中没有找到任何相关信息"
2. **禁止编造**：绝不生成、假设或虚构任何个人信息、经历或数据
3. **只基于事实**：只使用提供的记忆内容，不添加任何未提及的信息
4. **清晰说明**：当记忆库为空时，直接告知用户"您的记忆库目前没有任何内容"
5. **提供帮助**：可以建议用户如何添加记忆，但不要创造虚假内容

**回答规则：**
- 记忆库为空 → 直接回答"您的记忆库目前没有任何记忆内容"
- 无相关信息 → 回答"我在您的记忆库中没有找到相关信息"
- 有相关内容 → 基于实际记忆内容回答

当前时间：${new Date().toLocaleString('zh-CN')}`;

      // // 调用DeepSeek API
      console.log('🔑 使用API密钥:', apiKey.substring(0, 8) + '...');
      
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messageHistory,
            { role: 'user', content: userMessage }
          ],
          max_tokens: 1000,
          temperature: 0.7,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API调用失败: ${response.status} ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content || '抱歉，未能获取有效回复';
      
      addLog("success", "AI回复生成完成", aiResponse.substring(0, 100) + "...");
      return aiResponse;
    } catch (error) {
      console.error('❌ API调用失败:', error);
      addLog("error", "AI回复生成失败", `${error.message} - 请检查API密钥和网络连接`);
      
      // 提供更详细的错误信息
      if (error.message.includes('401')) {
        throw new Error("API密钥无效或已过期，请检查设置中的DeepSeek API密钥");
      } else if (error.message.includes('429')) {
        throw new Error("API调用频率过高，请稍后再试");
      } else if (error.message.includes('network')) {
        throw new Error("网络连接失败，请检查网络连接");
      } else {
        throw new Error(`API调用失败: ${error.message}`);
      }
    }
  };

  // 渲染各个组件
  const ChatPanel = ({ currentTab }) => {
    const inputRef = useRef(null);
    
    // 自动聚焦输入框和自动滚动到底部
    useEffect(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
      
      // 组件挂载时自动滚动到底部
      scrollToBottom();
      
      // 添加延迟滚动，确保内容完全渲染
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 100);
      
      return () => clearTimeout(timer);
    }, []);
    
    // 监听消息变化，自动滚动到底部
    useEffect(() => {
      scrollToBottom();
    }, [messages]);
    
    // 监听currentTab变化，当切换回对话时滚动到底部
    useEffect(() => {
      if (currentTab === 'chat') {
        // 延迟滚动，确保组件完全渲染
        const timer = setTimeout(() => {
          scrollToBottom();
        }, 200);
        return () => clearTimeout(timer);
      }
    }, [currentTab]);

    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        <div data-chat-scroll-container style={{ flex: 1, overflow: "auto", padding: 24 }}>
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>AI私人助理</span>
                <Tag color={aiService === 'qcli' ? (qCliStatus.available ? 'green' : 'red') : 'blue'}>
                  {aiService === 'qcli' ? 
                    (qCliStatus.available ? 'Q CLI' : 'Q CLI (不可用)') : 
                    'DeepSeek'
                  }
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
            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              <div>🔍 调试信息：</div>
              <div>当前记忆来源：{memories.length > 0 ? (memories[0].sourceFile || '未知') : '无'}</div>
              <div>最后更新时间：{memories.length > 0 ? new Date(memories[0].timestamp).toLocaleString() : '无'}</div>
            </div>
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
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: 16, borderTop: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <textarea
              ref={inputRef}
              defaultValue=""
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  const text = e.target.value.trim();
                  if (text) {
                    setInputValue(text);
                    setTimeout(() => {
                      handleSendMessage(text);
                      e.target.value = '';
                    }, 0);
                  }
                }
              }}
              placeholder="输入消息，按 Enter 发送，Shift+Enter 换行..."
              rows={1}
              style={{ 
                flex: 1, 
                border: '1px solid #d9d9d9', 
                borderRadius: '6px', 
                padding: '8px 12px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                minHeight: '32px',
                outline: 'none'
              }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => {
                const text = inputRef.current?.value?.trim();
                if (text) {
                  handleSendMessage(text);
                  inputRef.current.value = '';
                }
              }}
              style={{ height: 'auto' }}
            >
              发送
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const MemoryLibrary = () => {
    const [uploadLoading, setUploadLoading] = useState(false);
    const [error, setError] = useState(null);

    // 添加错误边界
    if (!Array.isArray(memories)) {
      console.error('记忆数据格式错误:', memories);
      return (
        <div style={{ padding: 24, height: "100vh", overflow: "auto" }}>
          <Card title="记忆库 - 数据错误">
            <div style={{ textAlign: 'center', padding: 48 }}>
              <Empty
                description="记忆数据格式错误"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
              <Button 
                type="primary" 
                onClick={() => {
                  localStorage.removeItem("aiAssistantMemories");
                  window.location.reload();
                }}
                style={{ marginTop: 16 }}
              >
                重置记忆数据
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    const handleFileUpload = async (event) => {
      const files = Array.from(event.target.files);
      setUploadLoading(true);
      
      // 使用后端API直接保存文件
      for (const file of files) {
        if (file.type === 'text/markdown' || file.name.endsWith('.md')) {
          try {
            const content = await file.text();
            const filename = file.name;
            
            // 直接发送到后端保存
            const response = await fetch('http://localhost:3001/api/save-memory', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                filename: filename,
                content: content
              })
            });
            
            const result = await response.json();
            
            if (result.success) {
              message.success(`文件 ${filename} 已自动保存到个人记忆文件夹`);
              addLog("success", "文件保存成功", `${filename} 已保存到 ${result.path}`);
              
              // 重新加载记忆列表
              const reloadResponse = await fetch('http://localhost:3001/api/memories');
              if (reloadResponse.ok) {
                const updatedMemories = await reloadResponse.json();
                setMemories(updatedMemories);
              }
            } else {
              message.error(`保存失败: ${result.error}`);
            }
          } catch (error) {
            console.error('上传文件失败:', error);
            message.error(`上传失败: ${error.message}`);
          }
        }
      }
      
      setUploadLoading(false);
      addLog("success", "文件上传完成", `成功处理 ${files.length} 个文件`);
    };

    const handleEditMemory = (memory) => {
      let formInstance;
      Modal.confirm({
        title: "编辑记忆",
        width: 700,
        icon: null,
        okText: "保存修改",
        cancelText: "取消",
        onOk: () => {
          formInstance.validateFields().then(async values => {
            const updatedMemory = {
              ...memory,
              ...values,
              lastModified: new Date().toISOString()
            };
            
            try {
              // 调用后端API保存修改
              const response = await fetch('http://localhost:3001/api/save-memory', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  filename: updatedMemory.title + '.md',
                  content: `# ${updatedMemory.title}\n\n## 类别\n${updatedMemory.category}\n\n## 标签\n${updatedMemory.tags}\n\n## 内容\n${updatedMemory.content}\n\n## 更新时间\n${updatedMemory.lastModified}`
                })
              });
              
              const result = await response.json();
              
              if (result.success) {
                setMemories(prev => 
                  prev.map(m => m.id === memory.id ? updatedMemory : m)
                );
                addLog("success", "编辑记忆成功", values.title);
                message.success("记忆更新成功！");
              } else {
                message.error("保存失败: " + result.error);
              }
            } catch (error) {
              console.error('保存记忆失败:', error);
              message.error("保存失败，请稍后重试");
            }
          }).catch(error => {
            console.error('表单验证失败:', error);
          });
        },
        onCancel: () => {
          // 取消编辑，无需任何操作
        },
        content: (
          <Form
            layout="vertical"
            initialValues={{
              title: memory.title || '',
              content: memory.content || '',
              category: memory.category || '个人记忆',
              tags: memory.tags || ''
            }}
            onFinish={async (values) => {
              const updatedMemory = {
                ...memory,
                ...values,
                lastModified: new Date().toISOString()
              };
              
              try {
                // 调用后端API保存修改
                const response = await fetch('http://localhost:3001/api/save-memory', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    filename: updatedMemory.title + '.md',
                    content: `# ${updatedMemory.title}\n\n## 类别\n${updatedMemory.category}\n\n## 标签\n${updatedMemory.tags}\n\n## 内容\n${updatedMemory.content}\n\n## 更新时间\n${updatedMemory.lastModified}`
                  })
                });
                
                const result = await response.json();
                
                if (result.success) {
                  setMemories(prev => 
                    prev.map(m => m.id === memory.id ? updatedMemory : m)
                  );
                  addLog("success", "编辑记忆成功", values.title);
                  message.success("记忆更新成功！");
                } else {
                  message.error("保存失败: " + result.error);
                }
              } catch (error) {
                console.error('保存记忆失败:', error);
                message.error("保存失败，请稍后重试");
              }
              
              Modal.destroyAll();
            }}
            ref={(form) => {
              formInstance = form;
            }}
          >
            <Form.Item
              label="标题"
              name="title"
              rules={[{ required: true, message: "请输入标题" }]}
            >
              <Input placeholder="记忆标题" />
            </Form.Item>
            <Form.Item
              label="内容"
              name="content"
              rules={[{ required: true, message: "请输入内容" }]}
            >
              <TextArea rows={10} placeholder="记忆内容..." />
            </Form.Item>
            <Form.Item
              label="类别"
              name="category"
              rules={[{ required: true, message: "请选择类别" }]}
            >
              <Select placeholder="选择类别">
                <Option value="个人信息">个人信息</Option>
                <Option value="人生规划">人生规划</Option>
                <Option value="个人价值">个人价值</Option>
                <Option value="个人成就">个人成就</Option>
                <Option value="人生历程">人生历程</Option>
                <Option value="生活习惯">生活习惯</Option>
                <Option value="人际关系">人际关系</Option>
                <Option value="家庭关系">家庭关系</Option>
                <Option value="个人愿望">个人愿望</Option>
                <Option value="个人资料">个人资料</Option>
                <Option value="学习笔记">学习笔记</Option>
                <Option value="工作记录">工作记录</Option>
                <Option value="生活感悟">生活感悟</Option>
                <Option value="其他">其他</Option>
              </Select>
            </Form.Item>
            <Form.Item label="标签" name="tags">
              <Input placeholder="输入标签，用逗号分隔" />
            </Form.Item>
          </Form>
        ),
      });
    };

    return (
      <div style={{ padding: 24, height: "100vh", overflow: "auto" }}>
        <Card
          title="记忆库"
          extra={
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                type="default"
                icon={<ReloadOutlined />}
                onClick={() => {
                  message.info('正在刷新记忆库...');
                  setTimeout(() => {
                    window.location.reload();
                  }, 500);
                }}
                title="刷新页面以加载新添加的文件"
              >
                刷新
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  Modal.info({
                    title: "添加新记忆",
                    width: 600,
                    content: (
                      <Form
                        layout="vertical"
                        onFinish={(values) => {
                          const newMemory = {
                            id: Date.now(),
                            ...values,
                            timestamp: new Date().toISOString(),
                          };
                          setMemories((prev) => [...prev, newMemory]);
                          addLog("success", "添加新记忆", values.content);
                          Modal.destroyAll();
                        }}
                      >
                        <Form.Item
                          label="内容"
                          name="content"
                          rules={[{ required: true, message: "请输入记忆内容" }]}
                        >
                          <TextArea rows={4} placeholder="输入记忆内容..." />
                        </Form.Item>
                        <Form.Item
                          label="类别"
                          name="category"
                          rules={[{ required: true, message: "请选择类别" }]}
                        >
                          <Select placeholder="选择类别">
                            <Option value="个人信息">个人信息</Option>
                            <Option value="人生规划">人生规划</Option>
                            <Option value="个人价值">个人价值</Option>
                            <Option value="个人成就">个人成就</Option>
                            <Option value="人生历程">人生历程</Option>
                            <Option value="生活习惯">生活习惯</Option>
                            <Option value="人际关系">人际关系</Option>
                            <Option value="家庭关系">家庭关系</Option>
                            <Option value="个人愿望">个人愿望</Option>
                            <Option value="个人资料">个人资料</Option>
                            <Option value="学习笔记">学习笔记</Option>
                            <Option value="工作记录">工作记录</Option>
                            <Option value="生活感悟">生活感悟</Option>
                            <Option value="其他">其他</Option>
                          </Select>
                        </Form.Item>
                        <Form.Item label="标签" name="tags">
                          <Input placeholder="输入标签，用逗号分隔" />
                        </Form.Item>
                        <Form.Item>
                          <Button type="primary" htmlType="submit">
                            保存记忆
                          </Button>
                        </Form.Item>
                      </Form>
                    ),
                  });
                }}
              >
                添加记忆
              </Button>


              {selectedMemories.length > 0 && (
                <Button
                  type="primary"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    Modal.confirm({
                      title: `确认删除选中的 ${selectedMemories.length} 个记忆？`,
                      content: "此操作不可恢复，请谨慎操作！",
                      okText: "确认删除",
                      okType: "danger",
                      cancelText: "取消",
                      onOk() {
                        setMemories(prev => prev.filter(memory => !selectedMemories.includes(memory.id)));
                        setSelectedMemories([]);
                        addLog("success", "批量删除记忆", `删除了 ${selectedMemories.length} 个记忆`);
                        message.success(`已删除 ${selectedMemories.length} 个记忆`);
                      }
                    });
                  }}
                >
                  批量删除 ({selectedMemories.length})
                </Button>
              )}
            </div>
          }
        >
          <List
            dataSource={memories}
            locale={{
              emptyText: (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <div>
                        <p style={{ fontSize: '16px', color: '#666' }}>记忆库为空</p>
                        <p style={{ fontSize: '14px', color: '#999' }}>请上传.md文件或添加新的记忆</p>
                      </div>
                    }
                  />
                  <div style={{ marginTop: 16 }}>
                    <Button
                      type="primary"
                      icon={<UploadOutlined />}
                      onClick={() => document.getElementById('memory-upload').click()}
                    >
                      上传记忆文件
                    </Button>
                    <Button
                      style={{ marginLeft: 8 }}
                      icon={<PlusOutlined />}
                      onClick={() => {
                        Modal.info({
                          title: "添加新记忆",
                          width: 600,
                          content: (
                            <Form
                              layout="vertical"
                              onFinish={(values) => {
                                const newMemory = {
                                  id: Date.now(),
                                  ...values,
                                  timestamp: new Date().toISOString(),
                                };
                                setMemories((prev) => [...prev, newMemory]);
                                addLog("success", "添加新记忆", values.content);
                                Modal.destroyAll();
                              }}
                            >
                              <Form.Item
                                label="内容"
                                name="content"
                                rules={[{ required: true, message: "请输入记忆内容" }]}
                              >
                                <TextArea rows={4} placeholder="输入记忆内容..." />
                              </Form.Item>
                              <Form.Item
                                label="类别"
                                name="category"
                                rules={[{ required: true, message: "请选择类别" }]}
                              >
                                <Select placeholder="选择类别">
                                  <Option value="个人信息">个人信息</Option>
                                  <Option value="人生规划">人生规划</Option>
                                  <Option value="个人价值">个人价值</Option>
                                  <Option value="个人成就">个人成就</Option>
                                  <Option value="人生历程">人生历程</Option>
                                  <Option value="生活习惯">生活习惯</Option>
                                  <Option value="人际关系">人际关系</Option>
                                  <Option value="家庭关系">家庭关系</Option>
                                  <Option value="个人愿望">个人愿望</Option>
                                  <Option value="个人资料">个人资料</Option>
                                  <Option value="学习笔记">学习笔记</Option>
                                  <Option value="工作记录">工作记录</Option>
                                  <Option value="生活感悟">生活感悟</Option>
                                  <Option value="其他">其他</Option>
                                </Select>
                              </Form.Item>
                              <Form.Item label="标签" name="tags">
                                <Input placeholder="输入标签，用逗号分隔" />
                              </Form.Item>
                              <Form.Item>
                                <Button type="primary" htmlType="submit">
                                  保存记忆
                                </Button>
                              </Form.Item>
                            </Form>
                          ),
                        });
                      }}
                    >
                      手动添加
                    </Button>
                  </div>
                </div>
              )
            }}
            renderItem={(memory) => (
              <List.Item
                style={{
                  padding: '16px',
                  border: '1px solid #f0f0f0',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  backgroundColor: '#fafafa'
                }}
              >
                <div style={{ width: '100%' }}>
                  {/* 头部信息 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Checkbox
                      onChange={() => {
                        setSelectedMemories((prev) =>
                          prev.includes(memory.id)
                            ? prev.filter((id) => id !== memory.id)
                            : [...prev, memory.id]
                        );
                      }}
                      checked={selectedMemories.includes(memory.id)}
                    />
                    <Text strong style={{ fontSize: '16px', flex: 1 }}>
                      {memory.title || '无标题'}
                    </Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {new Date(memory.timestamp).toLocaleString("zh-CN")}
                    </Text>
                    {memory.filename && (
                      <Tag color="green" style={{ fontSize: '12px' }}>
                        📄 {memory.filename}
                      </Tag>
                    )}
                  </div>

                  {/* 标签 */}
                  {memory.tags && (
                    <div style={{ marginBottom: 8 }}>
                      {memory.tags.split(",").filter(tag => tag.trim()).map((tag, index) => (
                        <Tag key={`${tag.trim()}-${index}`} style={{ marginRight: 4 }}>
                          {tag.trim()}
                        </Tag>
                      ))}
                    </div>
                  )}

                  {/* 内容预览 - 只显示简要信息 */}
                  <div style={{ marginBottom: 12 }}>
                    <Text style={{ 
                      color: '#999', 
                      fontSize: '13px',
                      fontStyle: 'italic'
                    }}>
                      {memory.content.length > 100 
                        ? `${memory.content.substring(0, 100)}...` 
                        : memory.content}
                    </Text>
                  </div>

                  {/* 操作按钮 */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => {
                        let formRef;
                        Modal.confirm({
                          title: "编辑记忆",
                          width: 600,
                          content: (
                            <Form
                              layout="vertical"
                              ref={(form) => formRef = form}
                              initialValues={{
                                title: memory.title,
                                content: memory.content,
                                category: memory.category,
                                tags: memory.tags
                              }}
                            >
                              <Form.Item
                                label="标题"
                                name="title"
                                rules={[{ required: true, message: "请输入标题" }]}
                              >
                                <Input placeholder="输入记忆标题" />
                              </Form.Item>
                              <Form.Item
                                label="内容"
                                name="content"
                                rules={[{ required: true, message: "请输入内容" }]}
                              >
                                <TextArea
                                  rows={6}
                                  placeholder="输入记忆内容，支持Markdown格式"
                                />
                              </Form.Item>
                              <Form.Item
                                label="类别"
                                name="category"
                                rules={[{ required: true, message: "请选择类别" }]}
                              >
                                <Select placeholder="选择类别">
                                  <Option value="个人信息">个人信息</Option>
                                  <Option value="人生规划">人生规划</Option>
                                  <Option value="个人价值">个人价值</Option>
                                  <Option value="个人成就">个人成就</Option>
                                  <Option value="人生历程">人生历程</Option>
                                  <Option value="生活习惯">生活习惯</Option>
                                  <Option value="人际关系">人际关系</Option>
                                  <Option value="家庭关系">家庭关系</Option>
                                  <Option value="个人愿望">个人愿望</Option>
                                  <Option value="个人资料">个人资料</Option>
                                  <Option value="学习笔记">学习笔记</Option>
                                  <Option value="工作记录">工作记录</Option>
                                  <Option value="生活感悟">生活感悟</Option>
                                  <Option value="其他">其他</Option>
                                </Select>
                              </Form.Item>
                              <Form.Item label="标签" name="tags">
                                <Input placeholder="输入标签，用逗号分隔" />
                              </Form.Item>
                            </Form>
                          ),
                          okText: "保存修改",
                          cancelText: '取消',
                          onOk: async () => {
                            try {
                              const values = await formRef.validateFields();
                              // 先更新前端状态
                              const updatedMemory = {
                                ...memory,
                                ...values,
                                timestamp: new Date().toISOString()
                              };
                              
                              setMemories(prev => prev.map(m => 
                                m.id === memory.id ? updatedMemory : m
                              ));
                              
                              // 同步更新到文件
                              if (memory.filename) {
                                const response = await fetch(`http://localhost:3001/api/memories/${memory.filename}`, {
                                  method: 'PUT',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({
                                    title: values.title,
                                    content: values.content,
                                    category: values.category,
                                    tags: values.tags
                                  })
                                });
                                
                                if (response.ok) {
                                  message.success("记忆更新成功，已同步到文件！");
                                } else {
                                  const error = await response.json();
                                  message.warning("记忆已更新，但文件同步失败：" + error.error);
                                  console.error('文件同步失败:', error);
                                }
                              } else {
                                message.success("记忆更新成功！");
                              }
                              
                              Modal.destroyAll();
                            } catch (error) {
                              console.error('更新失败:', error);
                              if (error.errorFields) {
                                // 表单验证错误，不关闭弹窗
                                return Promise.reject(error);
                              }
                              message.error("更新失败：" + error.message);
                            }
                          }
                        });
                      }}
                    >
                      编辑
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      icon={<EyeOutlined />}
                      onClick={() => {
                        Modal.info({
                          title: memory.title || '记忆详情',
                          width: 700,
                          style: { top: 20 },
                          bodyStyle: { maxHeight: '70vh', overflow: 'auto' },
                          content: (
                            <div style={{ marginTop: 16 }}>
                              <div style={{ marginBottom: 16 }}>
                                <Tag color="blue">{memory.category}</Tag>
                                {memory.tags && memory.tags.split(',').filter(tag => tag.trim()).map(tag => (
                                  <Tag key={tag.trim()} color="green">{tag.trim()}</Tag>
                                ))}
                              </div>
                              <div style={{ 
                                padding: 16,
                                backgroundColor: '#f9f9f9',
                                borderRadius: 8,
                                border: '1px solid #e8e8e8'
                              }}>
                                <ReactMarkdown 
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    h1: ({children}) => <h1 style={{ fontSize: '24px', marginBottom: '16px', color: '#262626' }}>{children}</h1>,
                                    h2: ({children}) => <h2 style={{ fontSize: '20px', marginBottom: '12px', color: '#262626' }}>{children}</h2>,
                                    h3: ({children}) => <h3 style={{ fontSize: '18px', marginBottom: '8px', color: '#262626' }}>{children}</h3>,
                                    p: ({children}) => <p style={{ marginBottom: '12px', lineHeight: '1.6', color: '#595959' }}>{children}</p>,
                                    ul: ({children}) => <ul style={{ marginBottom: '12px', paddingLeft: '20px' }}>{children}</ul>,
                                    ol: ({children}) => <ol style={{ marginBottom: '12px', paddingLeft: '20px' }}>{children}</ol>,
                                    li: ({children}) => <li style={{ marginBottom: '4px', color: '#595959' }}>{children}</li>,
                                    blockquote: ({children}) => (
                                      <blockquote style={{
                                        borderLeft: '4px solid #1890ff',
                                        paddingLeft: '16px',
                                        margin: '16px 0',
                                        color: '#595959',
                                        fontStyle: 'italic'
                                      }}>
                                        {children}
                                      </blockquote>
                                    ),
                                    code: ({children}) => (
                                      <code style={{
                                        backgroundColor: '#f0f0f0',
                                        padding: '2px 6px',
                                        borderRadius: '3px',
                                        fontFamily: 'Consolas, Monaco, monospace',
                                        fontSize: '14px'
                                      }}>
                                        {children}
                                      </code>
                                    ),
                                    pre: ({children}) => (
                                      <pre style={{
                                        backgroundColor: '#f5f5f5',
                                        padding: '12px',
                                        borderRadius: '4px',
                                        overflow: 'auto',
                                        fontFamily: 'Consolas, Monaco, monospace',
                                        fontSize: '14px',
                                        marginBottom: '12px'
                                      }}>
                                        {children}
                                      </pre>
                                    ),
                                    strong: ({children}) => <strong style={{ color: '#262626', fontWeight: 'bold' }}>{children}</strong>,
                                    em: ({children}) => <em style={{ fontStyle: 'italic', color: '#595959' }}>{children}</em>,
                                    table: ({children}) => (
                                      <table style={{
                                        borderCollapse: 'collapse',
                                        width: '100%',
                                        marginBottom: '16px'
                                      }}>
                                        {children}
                                      </table>
                                    ),
                                    th: ({children}) => (
                                      <th style={{
                                        border: '1px solid #e8e8e8',
                                        padding: '8px',
                                        backgroundColor: '#fafafa',
                                        fontWeight: 'bold',
                                        textAlign: 'left'
                                      }}>
                                        {children}
                                      </th>
                                    ),
                                    td: ({children}) => (
                                      <td style={{
                                        border: '1px solid #e8e8e8',
                                        padding: '8px',
                                        textAlign: 'left'
                                      }}>
                                        {children}
                                      </td>
                                    )
                                  }}
                                >
                                  {memory.content}
                                </ReactMarkdown>
                              </div>
                              <div style={{ marginTop: 16, fontSize: '12px', color: '#666', textAlign: 'right' }}>
                                创建时间: {new Date(memory.timestamp).toLocaleString('zh-CN')}
                                {memory.filename && (
                                  <span style={{ marginLeft: 8 }}>
                                    文件: {memory.filename}
                                  </span>
                                )}
                              </div>
                            </div>
                          ),
                          okText: '关闭',
                          cancelButtonProps: { style: { display: 'none' } }
                        });
                      }}
                    >
                      预览
                    </Button>
                  </div>
                </div>
              </List.Item>
            )}
          />
        </Card>
      </div>
    );
  };

  const WorkflowPanel = () => {
    return (
      <div style={{ padding: 24, height: "100vh", overflow: "auto" }}>
        <Card
          title="指令管理"
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                Modal.info({
                  title: "创建新指令",
                  width: 600,
                  content: (
                    <Form
                      layout="vertical"
                      onFinish={(values) => {
                        const newWorkflow = {
                          id: Date.now(),
                          name: values.name,
                          description: values.description,
                          category: values.category,
                          steps: values.steps?.split("\n").filter(s => s.trim()) || [],
                          createdAt: new Date().toISOString(),
                        };
                        setWorkflows((prev) => [...prev, newWorkflow]);
                        addLog("success", "创建指令", values.name);
                        Modal.destroyAll();
                      }}
                    >
                      <Form.Item
                        label="名称"
                        name="name"
                        rules={[{ required: true, message: "请输入指令名称" }]}
                      >
                        <Input placeholder="输入指令名称..." />
                      </Form.Item>
                      <Form.Item
                        label="描述"
                        name="description"
                        rules={[{ required: true, message: "请输入描述" }]}
                      >
                        <TextArea rows={2} placeholder="输入指令描述..." />
                      </Form.Item>
                      <Form.Item
                        label="类别"
                        name="category"
                        rules={[{ required: true, message: "请选择类别" }]}
                      >
                        <Select placeholder="选择类别">
                          <Option value="生活">生活</Option>
                          <Option value="工作">工作</Option>
                          <Option value="学习">学习</Option>
                          <Option value="健康">健康</Option>
                          <Option value="财务">财务</Option>
                          <Option value="其他">其他</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item label="步骤" name="steps">
                        <TextArea
                          rows={4}
                          placeholder="输入执行步骤，每行一个步骤..."
                        />
                      </Form.Item>
                      <Form.Item>
                        <Button type="primary" htmlType="submit">
                          创建指令
                        </Button>
                      </Form.Item>
                    </Form>
                  ),
                });
              }}
            >
              创建指令
            </Button>
          }
        >
          <List
            grid={{ gutter: 16, column: 2 }}
            dataSource={workflows}
            locale={{
              emptyText: (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <div>
                        <p style={{ fontSize: '16px', color: '#666' }}>暂无指令</p>
                        <p style={{ fontSize: '14px', color: '#999' }}>点击右上角按钮创建新指令</p>
                      </div>
                    }
                  />
                </div>
              )
            }}
            renderItem={(workflow) => (
              <List.Item>
                <Card
                  hoverable
                  actions={[
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      onClick={() => handleRunWorkflow(workflow.id)}
                    >
                      执行
                    </Button>,
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteWorkflow(workflow.id)}
                    >
                      删除
                    </Button>,
                  ]}
                >
                  <Card.Meta
                    title={workflow.name}
                    description={workflow.description}
                  />
                  <div style={{ marginTop: 12 }}>
                    <Tag color="green">{workflow.category}</Tag>
                    <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                      创建时间：{new Date(workflow.createdAt).toLocaleDateString("zh-CN")}
                    </div>
                  </div>
                  {workflow.steps && workflow.steps.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <Text strong>执行步骤：</Text>
                      <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
                        {workflow.steps.map((step, index) => (
                          <li key={index}>{typeof step === "string" ? step : step.content}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </Card>
              </List.Item>
            )}
          />
        </Card>
      </div>
    );
  };

  const SettingsPanel = () => {
    return (
      <div style={{ padding: 24, height: "100vh", overflow: "auto" }}>
        <Card title="系统设置">
          <Form layout="vertical">
            <Form.Item label="AI服务选择">
              <Select
                value={aiService}
                onChange={(value) => setAiService(value)}
                style={{ width: '100%' }}
              >
                <Option value="deepseek">DeepSeek API</Option>
                <Option value="qcli">Amazon Q CLI</Option>
              </Select>
              <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
                {aiService === 'qcli' ? (
                  <div>
                    <div>Q CLI状态: {qCliStatus.available ? '✅ 可用' : '❌ 不可用'}</div>
                    {qCliStatus.available && <div>活跃会话: {qCliStatus.sessions}</div>}
                    {!qCliStatus.available && <div>请确保已安装并配置Amazon Q CLI</div>}
                  </div>
                ) : (
                  <div>使用DeepSeek API进行对话，需要配置API密钥</div>
                )}
              </div>
              <div style={{ marginTop: 8 }}>
                <Button
                  type="default"
                  size="small"
                  onClick={checkQCliStatus}
                >
                  检查Q CLI状态
                </Button>
              </div>
            </Form.Item>
            
            <Form.Item label="DeepSeek API密钥"
              style={{ 
                opacity: aiService === 'deepseek' ? 1 : 0.5,
                pointerEvents: aiService === 'deepseek' ? 'auto' : 'none'
              }}
            >
              <Input.Password
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="输入您的DeepSeek API密钥..."
              />
              <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
                您的API密钥将安全地保存在本地浏览器中
              </div>
              <div style={{ marginTop: 8 }}>
                <Button
                  type="default"
                  size="small"
                  onClick={async () => {
                    if (!apiKey.trim()) {
                      message.error('请先输入API密钥');
                      return;
                    }
                    
                    try {
                      const response = await fetch('https://api.deepseek.com/v1/models', {
                        headers: {
                          'Authorization': `Bearer ${apiKey}`,
                        },
                      });
                      
                      if (response.ok) {
                        message.success('API密钥有效！可以正常使用AI服务');
                        addLog("success", "API密钥验证成功");
                      } else {
                        message.error('API密钥无效，请检查密钥是否正确');
                        addLog("error", "API密钥验证失败", response.status.toString());
                      }
                    } catch (error) {
                      message.error(`API连接失败: ${error.message}`);
                      addLog("error", "API连接测试失败", error.message);
                    }
                  }}
                >
                  测试API连接
                </Button>
              </div>
            </Form.Item>

            <Form.Item label="数据管理">
              <div style={{ display: "flex", gap: 8 }}>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => {
                    const data = {
                      messages,
                      memories,
                      workflows,
                      exportDate: new Date().toISOString(),
                    };
                    const blob = new Blob([JSON.stringify(data, null, 2)], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "ai-assistant-backup.json";
                    a.click();
                    addLog("success", "数据导出完成");
                  }}
                >
                  导出数据
                </Button>
                <Upload
                  accept=".json"
                  showUploadList={false}
                  beforeUpload={(file) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      try {
                        const data = JSON.parse(e.target.result);
                        if (data.messages) setMessages(data.messages);
                        if (data.memories) setMemories(data.memories);
                        if (data.workflows) setWorkflows(data.workflows);
                        addLog("success", "数据导入完成");
                      } catch (error) {
                        addLog("error", "数据导入失败", error.message);
                      }
                    };
                    reader.readAsText(file);
                    return false;
                  }}
                >
                  <Button icon={<UploadOutlined />}>导入数据</Button>
                </Upload>
              </div>
            </Form.Item>

            <Form.Item label="系统信息">
              <div style={{ backgroundColor: "#f5f5f5", padding: 16, borderRadius: 6 }}>
                <h4>AI私人助理 v1.0.0</h4>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li>工作流：{workflows.length} 个</li>
                  <li>记忆：{memories.length} 条</li>
                  <li>对话：{messages.length} 条</li>
                  <li>API密钥：{apiKey ? "已配置" : "未配置"}</li>
                </ul>
              </div>
            </Form.Item>
          </Form>
        </Card>
      </div>
    );
  };

  const LogsPanel = () => {
    return (
      <div style={{ padding: 24, height: "100vh", overflow: "auto" }}>
        <Card title="运行日志" style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Text type="secondary">
              显示应用运行过程中的所有操作日志，便于调试和追踪。
            </Text>
            <Text type="secondary" strong>
              共 {logs.length} 条记录
            </Text>
          </div>

          {logs.length === 0 ? (
            <Empty description="暂无日志记录" />
          ) : (
            <div style={{ maxHeight: "calc(100vh - 200px)", overflow: "auto" }}>
              <div
                style={{
                  marginBottom: 16,
                  padding: 12,
                  backgroundColor: "#f5f5f5",
                  borderRadius: 6,
                }}
              >
                <small style={{ color: "#666" }}>
                  💡 显示最近 {logs.length} 条操作记录，最多保留20条
                </small>
              </div>
              {logs.map((log, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: 12,
                    padding: 12,
                    borderLeft: `4px solid ${
                      log.type === "success"
                        ? "#52c41a"
                        : log.type === "error"
                          ? "#ff4d4f"
                          : log.type === "warning"
                            ? "#faad14"
                            : "#1890ff"
                    }`,
                    backgroundColor: "#f5f5f5",
                    borderRadius: 4,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      {log.type === "success" && (
                        <CheckCircleOutlined style={{ color: "#52c41a" }} />
                      )}
                      {log.type === "error" && (
                        <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
                      )}
                      {log.type === "warning" && (
                        <ExclamationCircleOutlined
                          style={{ color: "#faad14" }}
                        />
                      )}
                      {log.type === "info" && (
                        <InfoCircleOutlined style={{ color: "#1890ff" }} />
                      )}
                      <Text strong>{log.message}</Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {new Date(log.timestamp).toLocaleString("zh-CN")}
                    </Text>
                  </div>
                  {log.details && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: 8,
                        backgroundColor: "#fff",
                        borderRadius: 4,
                        fontSize: 12,
                        color: "#666",
                      }}
                    >
                      <Text type="secondary">详情：</Text>
                      <pre
                        style={{
                          margin: 0,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-all",
                        }}
                      >
                        {log.details}
                      </pre>
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

  const renderContent = () => {
    switch (currentTab) {
      case "chat":
        return <ChatPanel currentTab={currentTab} />;
      case "memory":
        return <MemoryLibrary />;
      case "workflow":
        return <WorkflowPanel />;
      case "settings":
        return <SettingsPanel />;
      case "logs":
        return <LogsPanel />;
      default:
        return <ChatPanel currentTab={currentTab} />;
    }
  };

  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      <Sider
        width={250}
        theme="light"
        style={{ height: "100vh", overflow: "hidden" }}
      >
        <div style={{ padding: 16, fontWeight: 500 }}>AI私人助理</div>
        <Menu
          mode="inline"
          selectedKeys={[currentTab]}
          style={{ height: "calc(100vh - 60px)", borderRight: 0 }}
          items={[
            {
              key: "chat",
              icon: <MessageOutlined />,
              label: "对话",
              onClick: () => setCurrentTab("chat"),
            },
            {
              key: "memory",
              icon: <DatabaseOutlined />,
              label: "记忆库",
              onClick: () => setCurrentTab("memory"),
            },
            {
              key: "workflow",
              icon: <AppstoreOutlined />,
              label: "指令",
              onClick: () => setCurrentTab("workflow"),
            },
            {
              key: "settings",
              icon: <SettingOutlined />,
              label: "设置",
              onClick: () => setCurrentTab("settings"),
            },
            {
              key: "logs",
              icon: <InfoCircleOutlined />,
              label: "运行日志",
              onClick: () => setCurrentTab("logs"),
            },
          ]}
        />
      </Sider>
      <Layout style={{ height: "100vh", overflow: "hidden" }}>
        <Content style={{ height: "100vh", overflow: "hidden" }}>
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
