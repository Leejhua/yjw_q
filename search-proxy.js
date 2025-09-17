const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// 搜索代理端点
app.post('/search', async (req, res) => {
  try {
    const { query } = req.body;
    
    // 使用DuckDuckGo Instant Answer API
    const response = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
    
    res.json({
      query,
      result: response.data.AbstractText || response.data.Answer || '未找到相关信息',
      source: response.data.AbstractURL || response.data.AnswerURL,
      success: true
    });
  } catch (error) {
    res.json({
      query: req.body.query,
      error: error.message,
      success: false
    });
  }
});

app.listen(3002, () => {
  console.log('搜索代理服务运行在 http://localhost:3002');
});

module.exports = app;
