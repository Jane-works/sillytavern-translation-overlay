class AITranslatorPlugin {
    constructor() {
        this.apiUrl = '';
        this.apiKey = '';
        this.selectedModel = '';
        this.isEnabled = false;
        this.translationLanguage = 'zh-CN';
    }

    init() {
        this.createUI();
        this.loadSettings();
        this.setupEventListeners();
    }

    createUI() {
        // 创建悬浮窗口UI
        const floatingWindow = document.createElement('div');
        floatingWindow.id = 'ai-translator-window';
        floatingWindow.innerHTML = this.getUIHTML();
        document.body.appendChild(floatingWindow);
    }

    getUIHTML() {
        return `
            <div class="ai-translator-container">
                <div class="ai-translator-header">
                    <h3>AI翻译器</h3>
                    <button class="toggle-btn">−</button>
                </div>
                <div class="ai-translator-body">
                    <div class="settings-section">
                        <label>API URL:</label>
                        <input type="text" id="api-url" placeholder="https://api.openai.com/v1">
                        
                        <label>API密钥:</label>
                        <input type="password" id="api-key" placeholder="输入您的API密钥">
                        
                        <label>选择模型:</label>
                        <select id="model-select">
                            <option value="">请选择模型</option>
                        </select>
                        
                        <label>翻译语言:</label>
                        <select id="language-select">
                            <option value="zh-CN">中文</option>
                            <option value="en">英语</option>
                            <option value="ja">日语</option>
                        </select>
                        
                        <button id="save-settings">保存设置</button>
                        <button id="test-connection">测试连接</button>
                    </div>
                    
                    <div class="translation-section">
                        <div id="original-text"></div>
                        <div id="translated-text"></div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // 设置事件监听器
        document.getElementById('save-settings').addEventListener('click', () => this.saveSettings());
        document.getElementById('test-connection').addEventListener('click', () => this.testConnection());
        
        // 监听AI回复
        this.setupAIReplyListener();
    }

    setupAIReplyListener() {
        // 监听SillyTavern的AI回复事件
        // 这里需要根据SillyTavern的实际API进行调整
        const originalSendMessage = window.sendMessage;
        window.sendMessage = (...args) => {
            const result = originalSendMessage.apply(this, args);
            this.monitorAIResponse();
            return result;
        };
    }

    async monitorAIResponse() {
        // 监控AI回复并抓取<char>标签内容
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        this.extractAndTranslate(node);
                    }
                });
            });
        });

        observer.observe(document.getElementById('chat-container'), {
            childList: true,
            subtree: true
        });
    }

    async extractAndTranslate(node) {
        const charMatches = node.innerHTML.match(/<char>(.*?)<\/char>/g);
        if (charMatches) {
            for (const match of charMatches) {
                const text = match.replace(/<\/?char>/g, '');
                const translated = await this.translateText(text);
                this.displayTranslation(text, translated);
            }
        }
    }

    async translateText(text) {
        try {
            const response = await fetch(`${this.apiUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.selectedModel,
                    messages: [
                        {
                            role: "system",
                            content: `Translate this text to ${this.translationLanguage}`
                        },
                        {
                            role: "user",
                            content: text
                        }
                    ]
                })
            });

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('Translation error:', error);
            return '翻译失败';
        }
    }

    displayTranslation(original, translated) {
        const originalElement = document.getElementById('original-text');
        const translatedElement = document.getElementById('translated-text');
        
        originalElement.textContent = `原文: ${original}`;
        translatedElement.textContent = `译文: ${translated}`;
    }

    saveSettings() {
        this.apiUrl = document.getElementById('api-url').value;
        this.apiKey = document.getElementById('api-key').value;
        this.selectedModel = document.getElementById('model-select').value;
        this.translationLanguage = document.getElementById('language-select').value;
        
        // 保存到localStorage
        localStorage.setItem('aiTranslatorSettings', JSON.stringify({
            apiUrl: this.apiUrl,
            apiKey: this.apiKey,
            model: this.selectedModel,
            language: this.translationLanguage
        }));
    }

    loadSettings() {
        const saved = localStorage.getItem('aiTranslatorSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            // 加载设置到UI
        }
    }

    async testConnection() {
        // 测试API连接
    }
}

// 初始化插件
const plugin = new AITranslatorPlugin();
plugin.init();
