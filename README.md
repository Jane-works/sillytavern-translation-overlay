# SillyTavern 翻译悬浮窗插件

实时翻译<char>标签内容的AI悬浮窗插件。

## 功能特性
- 🎯 实时检测并翻译<char>标签内容
- 🖥️ 可拖动、可调整大小的悬浮窗
- 🌍 支持多语言翻译
- ⚙️ 高度可配置
- 🔌 支持主流AI API

## 安装方法
1. 下载本插件到SillyTavern的public/plugins目录
2. 复制config.example.js为config.js并配置API
3. 在SillyTavern中启用插件

## API配置示例
```javascript
// OpenAI格式API
apiUrl: 'https://api.openai.com/v1/chat/completions',

// 或DeepSeek格式API  
apiUrl: 'https://api.deepseek.com/chat/completions',
