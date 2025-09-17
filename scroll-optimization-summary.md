# 消息滚动优化方案

## 问题描述
每次发送消息后，滚动条会先跳到顶部，再滚动到底部，造成闪烁效果。

## 解决方案

### 1. 智能滚动触发
- **之前**: 每次 `messages` 变化都滚动
- **现在**: 只在消息数量增加时滚动（新消息）

```javascript
// 记录上一次消息数量
const prevMessagesLengthRef = useRef(0);

useEffect(() => {
  const currentLength = messages.length;
  const prevLength = prevMessagesLengthRef.current;
  
  // 只有在消息数量增加时才滚动
  if (currentLength > prevLength && currentLength > 0) {
    scrollToBottom();
  }
  
  prevMessagesLengthRef.current = currentLength;
}, [messages]);
```

### 2. 用户滚动检测
- 检测用户是否手动滚动到其他位置
- 如果用户在查看历史消息，不自动滚动到底部

```javascript
const isUserScrollingRef = useRef(false);

const handleScroll = () => {
  if (messagesContainerRef.current) {
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    isUserScrollingRef.current = !isAtBottom;
  }
};
```

### 3. 优化滚动时机
- 使用 `setTimeout` 确保 DOM 更新完成后再滚动
- 避免在渲染过程中触发滚动

```javascript
const scrollToBottom = () => {
  if (endRef.current && messagesContainerRef.current) {
    setTimeout(() => {
      endRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }, 0);
  }
};
```

### 4. 发送消息时重置状态
- 用户发送消息时，重置滚动状态
- 确保新消息能正常滚动到底部

```javascript
const handleSendMessage = async (text) => {
  // 重置用户滚动状态
  isUserScrollingRef.current = false;
  
  // ... 发送消息逻辑
};
```

### 5. 稳定的消息Key
- 确保每个消息有唯一且稳定的 key
- 避免 React 重建整个消息列表

```javascript
<List.Item
  key={message.id} // 稳定的唯一key
  // ...
>
```

## 优化效果

1. **消除闪烁**: 滚动条不再先跳到顶部再下来
2. **智能滚动**: 只在有新消息时滚动
3. **用户友好**: 用户查看历史消息时不会被打断
4. **性能提升**: 减少不必要的滚动操作
5. **平滑体验**: 使用平滑滚动动画

## 关键技术点

- `useRef` 保存状态，避免重渲染
- `setTimeout(fn, 0)` 确保 DOM 更新完成
- 滚动位置检测判断用户行为
- 消息数量对比避免无效滚动
- 稳定的 React key 避免重建
