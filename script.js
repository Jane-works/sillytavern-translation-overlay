class AITranslatorPlugin {
    constructor() {
        this.name = "AI Translator Plugin";
        this.version = "1.0.0";
        this.settings = {};
        this.isEnabled = false;
        this.observer = null;
    }

    async init() {
        await this.loadSettings();
        this.createUI();
        this.setupEventListeners();
        this.setupChatObserver();
        console.log(`${this.name} v${this.version} 初始化完成`);
    }

    async loadSettings() {
        // 从SillyTavern设置加载配置
        this.settings = {
            apiUrl: await this.getSetting('apiUrl') || 'https://api.openai.com/v1',
            apiKey: await this.getSetting('apiKey') || '',
            selectedModel: await this.getSetting('selectedModel') || 'gpt-3.5-turbo',
            translationLanguage: await this.getSetting('translationLanguage') || 'zh-CN',
            autoTranslate: await this.getSetting('autoTranslate') !== false,
            showNotifications: await this.getSetting('showNotifications') !== false,
            translationDelay: await this.getSetting('translationDelay') || 500
        };
    }

    createUI() {
        // 创建悬浮窗口UI
        const floatingWindow = document.createElement('div');
        floatingWindow.id = 'ai-translator-window';
        floatingWindow.className = 'floating-window';
        floatingWindow.innerHTML = this.getUIHTML();
        document.body.appendChild(floatingWindow);
        
        // 应用保存的位置
        this.applySavedPosition();
    }

    getUIHTML() {
        return `
            <div class="ai-translator-container">
                <div class="window-header">
                    <div class="window-title">
                        <span>AI翻译器</span>
                        <span class="status-indicator status-disconnected" id="status-indicator"></span>
                        <span id="status-text">未连接</span>
                    </div>
                    <div class="window-controls">
                        <button class="control-btn" id="minimize-btn">−</button>
                        <button class="control-btn" id="close-btn">×</button>
                    </div>
                </div>
                <div class="window-body">
                    <div class="section">
                        <h3 class="section-title">API设置</h3>
                        <div class="form-group">
                            <label for="api-url">API URL</label>
                            <input type="text" id="api-url" placeholder="https://api.openai.com/v1" value="${this.settings.apiUrl}">
                        </div>
                        <div class="form-group">
                            <label for="api-key">API密钥</label>
                            <input type="password" id="api-key" placeholder="输入您的API密钥" value="${this.settings.apiKey}">
                        </div>
                        <div class="form-group">
                            <label for="model-select">选择AI模型</label>
                            <select id="model-select">
                                ${this.getModelOptions()}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="language-select">翻译语言</label>
                            <select id="language-select">
                                ${this.getLanguageOptions()}
                            </select>
                        </div>
                        <div class="buttons-row">
                            <button class="btn btn-success" id="save-btn">保存设置</button>
                            <button class="btn" id="test-btn">测试连接</button>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h3 class="section-title">翻译结果</h3>
                        <div class="translation-area">
                            <div class="translation-text">
                                <div class="translation-label">原文</div>
                                <div class="translation-content" id="original-text">等待AI回复...</div>
                            </div>
                            <div class="translation-text">
                                <div class="translation-label">译文</div>
                                <div class="translation-content" id="translated-text">翻译将显示在这里...</div>
                            </div>
                        </div>
                        <div class="buttons-row">
                            <button class="btn btn-secondary" id="clear-btn">清空记录</button>
                            <button class="btn" id="auto-translate-btn">自动翻译: ${this.settings.autoTranslate ? '开启' : '关闭'}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getModelOptions() {
        const models = [
            {value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo"},
            {value: "gpt-4", label: "GPT-4"},
            {value: "gpt-4-turbo", label: "GPT-4 Turbo"},
            {value: "claude-3-opus", label: "Claude 3 Opus"},
            {value: "claude-3-sonnet", label: "Claude 3 Sonnet"},
            {value: "claude-3-haiku", label: "Claude 3 Haiku"}
        ];
        
        return models.map(model => 
            `<option value="${model.value}" ${this.settings.selectedModel === model.value ? 'selected' : ''}>${model.label}</option>`
        ).join('');
    }

    getLanguageOptions() {
        const languages = [
            {value: "zh-CN", label: "中文（简体）"},
            {value: "zh-TW", label: "中文（繁体）"},
            {value: "en", label: "英语"},
            {value: "ja", label: "日语"},
            {value: "ko", label: "韩语"},
            {value: "fr", label: "法语"},
            {value: "de", label: "德语"},
            {value: "es", label: "西班牙语"},
            {value: "ru", label: "俄语"}
        ];
        
        return languages.map(lang => 
            `<option value="${lang.value}" ${this.settings.translationLanguage === lang.value ? 'selected' : ''}>${lang.label}</option>`
        ).join('');
    }

    setupEventListeners() {
        // 设置各种事件监听器
        document.getElementById('save-btn').addEventListener('click', () => this.saveSettings());
        document.getElementById('test-btn').addEventListener('click', () => this.testConnection());
        document.getElementById('clear-btn').addEventListener('click', () => this.clearTranslations());
        document.getElementById('auto-translate-btn').addEventListener('click', () => this.toggleAutoTranslate());
        
        // 窗口控制
        document.getElementById('minimize-btn').addEventListener('click', () => this.minimizeWindow());
        document.getElementById('close-btn').addEventListener('click', () => this.closeWindow());
        
        // 拖拽功能
        this.setupDraggable();
    }

    setupChatObserver() {
        // 监听聊天区域的变化，抓取<char>标签
        const chatContainer = document.querySelector('#chat-container, .chat-container, [class*="chat"]');
        if (!chatContainer) {
            console.warn('未找到聊天容器，将在3秒后重试...');
            setTimeout(() => this.setupChatObserver(), 3000);
            return;
        }

        this.observer = new MutationObserver((mutations) => {
            if (!this.settings.autoTranslate) return;
            
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        setTimeout(() => this.extractAndTranslate(node), this.settings.translationDelay);
                    }
                });
            });
        });

        this.observer.observe(chatContainer, {
            childList: true,
            subtree: true
        });
    }

    async extractAndTranslate(node) {
        const htmlContent = node.innerHTML || node.textContent || '';
        const charMatches = htmlContent.match(/<char>(.*?)<\/char>/g);
        
        if (charMatches) {
            for (const match of charMatches) {
                const text = match.replace(/<\/?char>/g, '').trim();
                if (text) {
                    const translated = await this.translateText(text);
                    this.displayTranslation(text, translated);
                    
                    if (this.settings.showNotifications) {
                        this.showNotification('翻译完成', `已翻译: ${text.substring(0, 50)}...`);
                    }
                }
            }
        }
    }

    async translateText(text) {
        if (!this.settings.apiUrl || !this.settings.apiKey || !this.settings.selectedModel) {
            return '请先配置API设置';
        }

        try {
            const response = await fetch(`${this.settings.apiUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.settings.apiKey}`
                },
                body: JSON.stringify({
                    model: this.settings.selectedModel,
                    messages: [
                        {
                            role: "system",
                            content: `请将以下内容翻译成${this.getLanguageName(this.settings.translationLanguage)}，只返回翻译结果，不要添加任何解释。`
                        },
                        {
                            role: "user",
                            content: text
                        }
                    ],
                    max_tokens: 1000,
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('翻译错误:', error);
            return `翻译失败: ${error.message}`;
        }
    }

    getLanguageName(code) {
        const languages = {
            'zh-CN': '简体中文',
            'zh-TW': '繁体中文',
            'en': '英语',
            'ja': '日语',
            'ko': '韩语',
            'fr': '法语',
            'de': '德语',
            'es': '西班牙语',
            'ru': '俄语'
        };
        return languages[code] || code;
    }

    displayTranslation(original, translated) {
        const originalElement = document.getElementById('original-text');
        const translatedElement = document.getElementById('translated-text');
        
        // 保留历史记录，最多5条
        const timestamp = new Date().toLocaleTimeString();
        const newOriginal = `[${timestamp}] ${original}`;
        const newTranslated = `[${timestamp}] ${translated}`;
        
        if (originalElement.textContent === '等待AI回复...') {
            originalElement.textContent = newOriginal;
            translatedElement.textContent = newTranslated;
        } else {
            originalElement.innerHTML = newOriginal + '<br>' + originalElement.innerHTML;
            translatedElement.innerHTML = newTranslated + '<br>' + translatedElement.innerHTML;
            
            // 限制记录数量
            const originalLines = originalElement.innerHTML.split('<br>');
            const translatedLines = translatedElement.innerHTML.split('<br>');
            
            if (originalLines.length > 5) {
                originalElement.innerHTML = originalLines.slice(0, 5).join('<br>');
                translatedElement.innerHTML = translatedLines.slice(0, 5).join('<br>');
            }
        }
    }

    async saveSettings() {
        this.settings.apiUrl = document.getElementById('api-url').value;
        this.settings.apiKey = document.getElementById('api-key').value;
        this.settings.selectedModel = document.getElementById('model-select').value;
        this.settings.translationLanguage = document.getElementById('language-select').value;
        
        // 保存到SillyTavern设置
        await this.setSetting('apiUrl', this.settings.apiUrl);
        await this.setSetting('apiKey', this.settings.apiKey);
        await this.setSetting('selectedModel', this.settings.selectedModel);
        await this.setSetting('translationLanguage', this.settings.translationLanguage);
        
        this.updateStatus('设置已保存', 'success');
    }

    async testConnection() {
        if (!this.settings.apiUrl || !this.settings.apiKey || !this.settings.selectedModel) {
            this.updateStatus('请先填写API设置', 'error');
            return;
        }
        
        this.updateStatus('连接中...', 'connecting');
        
        try {
            // 发送测试请求
            const response = await fetch(`${this.settings.apiUrl}/models`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.settings.apiKey}`
                }
            });
            
            if (response.ok) {
                this.updateStatus('连接成功', 'success');
                
                // 显示测试翻译
                const testText = "This is a connection test. Hello world!";
                const translated = await this.translateText(testText);
                this.displayTranslation(testText, translated);
            } else {
                throw new Error(`API返回错误: ${response.status}`);
            }
        } catch (error) {
            console.error('连接测试失败:', error);
            this.updateStatus('连接失败: ' + error.message, 'error');
        }
    }

    updateStatus(message, type) {
        const indicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        
        indicator.className = 'status-indicator ' + 
            (type === 'success' ? 'status-connected' : 
             type === 'error' ? 'status-disconnected' : 'status-connecting');
        
        statusText.textContent = message;
    }

    clearTranslations() {
        document.getElementById('original-text').textContent = '等待AI回复...';
        document.getElementById('translated-text').textContent = '翻译将显示在这里...';
    }

    toggleAutoTranslate() {
        this.settings.autoTranslate = !this.settings.autoTranslate;
        const button = document.getElementById('auto-translate-btn');
        button.textContent = `自动翻译: ${this.settings.autoTranslate ? '开启' : '关闭'}`;
        
        this.setSetting('autoTranslate', this.settings.autoTranslate);
    }

    setupDraggable() {
        // 实现窗口拖拽功能
        const header = document.querySelector('.window-header');
        const window = document.getElementById('ai-translator-window');
        
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        
        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            const rect = window.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
            window.style.cursor = 'grabbing';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            window.style.left = (e.clientX - dragOffset.x) + 'px';
            window.style.top = (e.clientY - dragOffset.y) + 'px';
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            window.style.cursor = '';
            this.saveWindowPosition();
        });
    }

    saveWindowPosition() {
        const window = document.getElementById('ai-translator-window');
        const rect = window.getBoundingClientRect();
        
        localStorage.setItem('aiTranslatorWindowPosition', JSON.stringify({
            x: rect.left,
            y: rect.top
        }));
    }

    applySavedPosition() {
        const saved = localStorage.getItem('aiTranslatorWindowPosition');
        if (saved) {
            const position = JSON.parse(saved);
            const window = document.getElementById('ai-translator-window');
            window.style.left = position.x + 'px';
            window.style.top = position.y + 'px';
        }
    }

    minimizeWindow() {
        const body = document.querySelector('.window-body');
        body.style.display = body.style.display === 'none' ? 'block' : 'none';
    }

    closeWindow() {
        const window = document.getElementById('ai-translator-window');
        window.style.display = 'none';
        
        // 在实际实现中，这里应该提供重新打开窗口的方法
        setTimeout(() => {
            window.style.display = 'block';
        }, 5000);
    }

    showNotification(title, message) {
        // 使用浏览器通知API
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body: message });
        }
    }

    // SillyTavern插件API方法
    async getSetting(key) {
        // 从SillyTavern设置中获取值
        return new Promise((resolve) => {
            if (window.getExtensionSettings) {
                window.getExtensionSettings(this.name).then(settings => {
                    resolve(settings ? settings[key] : null);
                });
            } else {
                // 回退到localStorage
                const saved = localStorage.getItem(`aiTranslator_${key}`);
                resolve(saved ? JSON.parse(saved) : null);
            }
        });
    }

    async setSetting(key, value) {
        // 保存设置到SillyTavern
        return new Promise((resolve) => {
            if (window.setExtensionSetting) {
                window.setExtensionSetting(this.name, key, value).then(resolve);
            } else {
                // 回退到localStorage
                localStorage.setItem(`aiTranslator_${key}`, JSON.stringify(value));
                resolve();
            }
        });
    }
}

// 初始化插件
const plugin = new AITranslatorPlugin();

// SillyTavern插件注册
if (window.registerExtension) {
    window.registerExtension(plugin);
} else {
    // 如果不在SillyTavern环境中，直接初始化
    document.addEventListener('DOMContentLoaded', () => plugin.init());
}
