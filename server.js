const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Add error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('服务器内部错误');
});

// 处理AI对话请求
app.post('/api/chat', async (req, res) => {
  try {
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer 1e80f551-0afe-4c79-b169-477654514942`
      },
      body: JSON.stringify({
        model: "ep-20250220145352-7jd8l",
        messages: req.body.messages,
        stream: true,
        temperature: 0.6
      })
    });

    // 流式响应处理
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(new TextDecoder().decode(value));
    }
    res.end();
    
  } catch (error) {
    console.error('API请求失败:', error);
    res.status(500).json({ error: '服务暂时不可用' });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`服务器运行在 http://localhost:${PORT}`))
    .on('error', (err) => {
        console.error(`无法启动服务器: ${err.message}`);
        console.log(`端口 ${PORT} 可能已被占用，尝试更换端口号`);
    });