// 复制此文件为config.js并修改配置
export default {
    // API配置（支持OpenAI、DeepSeek等）
    apiUrl: 'https://api.deepseek.com/chat/completions',
    apiKey: 'your-api-key-here',
    
    // 翻译目标语言
    targetLanguage: 'zh-CN',
    
    // 悬浮窗默认位置和大小
    position: { x: 100, y: 100 },
    size: { width: 300, height: 200 },
    opacity: 0.9
};
