const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const port = 3000;
const API_KEY = '1e80f551-0afe-4c79-b169-477654514942';
const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

// 启用CORS和JSON解析中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// 处理聊天请求
app.post('/chat', async (req, res) => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'ep-20250220145352-7jd8l',
                messages: req.body.messages,
                temperature: 0.6,
                stream: true
            }),
            timeout: 60000 // 60秒超时
        });

        // 设置响应头以支持流式输出
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 读取并转发流式响应
        let buffer = '';
        let currentText = '';
        
        response.body.on('data', chunk => {
            buffer += chunk;
            const lines = buffer.split('\n');
            
            // 处理完整的行
            for (let i = 0; i < lines.length - 1; i++) {
                const line = lines[i].trim();
                if (line.startsWith('data:')) {
                    try {
                        const data = JSON.parse(line.slice(5));
                        if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                            currentText += data.choices[0].delta.content;
                        }
                    } catch (e) {
                        // 忽略解析错误
                        currentText += '网络错误';
                    }
                }
            }
            
            // 保留最后一行作为新的buffer
            buffer = lines[lines.length - 1];
            
            // 发送当前累积的文本
            if (currentText) {
                res.write(`data: ${currentText}\n\n`);
                currentText = '';
            }
        });

        response.body.on('end', () => {
            // 处理最后的buffer
            if (buffer) {
                const line = buffer.trim();
                if (line.startsWith('data:')) {
                    try {
                        const data = JSON.parse(line.slice(5));
                        if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                            currentText += data.choices[0].delta.content;
                        }
                    } catch (e) {
                        // 忽略解析错误
                        currentText += '网络错误';
                    }
                }
            }
            
            // 发送最后的文本
            if (currentText) {
                res.write(`data: ${currentText}\n\n`);
            }
            res.end();
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 启动服务器
app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
});