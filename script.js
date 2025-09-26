class TranslationOverlayPro {
    constructor() {
        this.isInitialized = false;
        this.overlay = null;
        this.settingsOpen = false;
        this.availableModels = [];
        this.currentConfig = {
            apiUrl: '',
            apiKey: '',
            selectedModel: '',
            targetLanguage: 'zh-CN',
            position: { x: 100, y: 100 },
            size: { width: 350, height: 250 },
            opacity: 0.95
        };
        this.init();
    }

    async init() {
        await this.loadSavedConfig();
        this.createOverlay();
        this.setupEventListeners();
        this.isInitialized = true;
        console.log('Translation Overlay Pro initialized');
    }

    async loadSavedConfig() {
        try {
            const saved = localStorage.getItem('translationOverlayConfig');
            if (saved) {
                const config = JSON.parse(saved);
                Object.assign(this.currentConfig, config);
            }
        } catch (e) {
            console.warn('无法加载保存的配置，使用默认配置');
        }
    }

    saveConfig() {
        try {
            localStorage.setItem('translationOverlayConfig', JSON.stringify(this.currentConfig));
        } catch (e) {
            console.error('保存配置失败:', e);
        }
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'translation-overlay-pro';
        this.overlay.innerHTML = this.getOverlayHTML();
        document.body.appendChild(this.overlay);
        this.applyStyles();
        this.makeDraggable();
    }

    getOverlayHTML() {
        return `
            <div class="translation-header">
                <span class="translation-title">🔤 AI翻译器</span>
                <div class="translation-controls">
                    <button class="control-btn settings" title="设置">⚙️</button>
                    <button class="control-btn minimize">−</button>
                    <button class="control-btn close">×</button>
                </div>
            </div>
            
            <div class="translation-content">
                <div class="text-display">
                    <div class="original-section">
                        <label>原文:</label>
                        <div class="original-text"></div>
                    </div>
                    <div class="translated-section">
                        <label>翻译:</label>
                        <div class="translated-text"></div>
                    </div>
                </div>
                <div class="translation-status">
                    <span class="status-text">就绪</span>
                    <span class="model-info"></span>
                </div>
            </div>

            <div class="settings-panel" style="display: none;">
                <div class="settings-header">
                    <h3>API设置</h3>
                    <button class="control-btn close-settings">×</button>
                </div>
                <div class="settings-content">
                    <div class="input-group">
                        <label>API地址:</label>
                        <input type="text" class="api-url" placeholder="https://api.deepseek.com/chat/completions" 
                               value="${this.currentConfig.apiUrl}">
                    </div>
                    <div class="input-group">
                        <label>API密钥:</label>
                        <input type="password" class="api-key" placeholder="输入您的API密钥" 
                               value="${this.currentConfig.apiKey}">
                    </div>
                    <div class="input-group">
                        <label>目标语言:</label>
                        <select class="target-language">
                            <option value="zh-CN" ${this.currentConfig.targetLanguage === 'zh-CN' ? 'selected' : ''}>简体中文</option>
                            <option value="zh-TW" ${this.currentConfig.targetLanguage === 'zh-TW' ? 'selected' : ''}>繁体中文</option>
                            <option value="en" ${this.currentConfig.targetLanguage === 'en' ? 'selected' : ''}>English</option>
                            <option value="ja" ${this.currentConfig.targetLanguage === 'ja' ? 'selected' : ''}>日本語</option>
                            <option value="ko" ${this.currentConfig.targetLanguage === 'ko' ? 'selected' : ''}>한국어</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label>模型:</label>
                        <select class="model-select">
                            <option value="">-- 请先获取模型 --</option>
                        </select>
                        <button class="btn fetch-models">获取模型</button>
                    </div>
                    <div class="settings-actions">
                        <button class="btn btn-primary save-settings">保存设置</button>
                        <button class="btn btn-secondary test-connection">测试连接</button>
                    </div>
                </div>
            </div>
        `;
    }

    applyStyles() {
        Object.assign(this.overlay.style, {
            left: `${this.currentConfig.position.x}px`,
            top: `${this.currentConfig.position.y}px`,
            width: `${this.currentConfig.size.width}px`,
            height: `${this.currentConfig.size.height}px`,
            opacity: this.currentConfig.opacity
        });
    }

    makeDraggable() {
        const header = this.overlay.querySelector('.translation-header');
        let isDragging = false;
        let offset = { x: 0, y: 0 };

        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('control-btn')) return;
            
            isDragging = true;
            offset.x = e.clientX - this.overlay.offsetLeft;
            offset.y = e.clientY - this.overlay.offsetTop;
            this.overlay.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            this.overlay.style.left = `${e.clientX - offset.x}px`;
            this.overlay.style.top = `${e.clientY - offset.y}px`;
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            this.overlay.style.cursor = 'grab';
            this.currentConfig.position = {
                x: this.overlay.offsetLeft,
                y: this.overlay.offsetTop
            };
            this.saveConfig();
        });
    }

    setupEventListeners() {
        // 控制按钮
        this.overlay.querySelector('.minimize').addEventListener('click', () => {
            const content = this.overlay.querySelector('.translation-content');
            content.style.display = content.style.display === 'none' ? 'flex' : 'none';
        });

        this.overlay.querySelector('.close').addEventListener('click', () => {
            this.overlay.style.display = 'none';
        });

        // 设置按钮
        this.overlay.querySelector('.settings').addEventListener('click', () => {
            this.toggleSettings();
        });

        this.overlay.querySelector('.close-settings').addEventListener('click', () => {
            this.toggleSettings(false);
        });

        // 设置面板功能
        this.setupSettingsPanel();
        
        // 监听消息
        this.setupMessageListener();
    }

    setupSettingsPanel() {
        // 获取模型按钮
        this.overlay.querySelector('.fetch-models').addEventListener('click', () => {
            this.fetchAvailableModels();
        });

        // 保存设置
        this.overlay.querySelector('.save-settings').addEventListener('click', () => {
            this.saveSettings();
        });

        // 测试连接
        this.overlay.querySelector('.test-connection').addEventListener('click', () => {
            this.testConnection();
        });
    }

    toggleSettings(show) {
        const settingsPanel = this.overlay.querySelector('.settings-panel');
        const content = this.overlay.querySelector('.translation-content');
        
        this.settingsOpen = show !== undefined ? show : !this.settingsOpen;
        
        if (this.settingsOpen) {
            settingsPanel.style.display = 'block';
            content.style.display = 'none';
            this.overlay.style.width = '400px';
            this.overlay.style.height = '450px';
        } else {
            settingsPanel.style.display = 'none';
            content.style.display = 'flex';
            this.overlay.style.width = `${this.currentConfig.size.width}px`;
            this.overlay.style.height = `${this.currentConfig.size.height}px`;
        }
    }

    async fetchAvailableModels() {
        const apiUrl = this.overlay.querySelector('.api-url').value;
        const apiKey = this.overlay.querySelector('.api-key').value;

        if (!apiUrl) {
            this.showStatus('请输入API地址', 'error');
            return;
        }

        this.showStatus('获取模型中...', 'loading');

        try {
            // 尝试不同的模型端点
            const endpoints = [
                '/models',
                '/v1/models',
                '/api/models'
            ];

            let models = [];
            for (const endpoint of endpoints) {
                try {
                    const modelUrl = apiUrl.replace(/\/chat\/completions$/, '') + endpoint;
                    const response = await fetch(modelUrl, {
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        models = this.extractModels(data);
                        if (models.length > 0) break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (models.length === 0) {
                // 如果无法获取模型列表，提供一些常见模型
                models = [
                    'gpt-3.5-turbo',
                    'gpt-4',
                    'deepseek-chat',
                    'deepseek-coder',
                    'claude-3-sonnet',
                    'claude-3-haiku'
                ];
            }

            this.populateModelSelect(models);
            this.showStatus(`获取到 ${models.length} 个模型`, 'success');

        } catch (error) {
            console.error('获取模型失败:', error);
            this.showStatus('获取模型失败，使用默认模型', 'error');
            this.populateModelSelect(['gpt-3.5-turbo', 'gpt-4']);
        }
    }

    extractModels(data) {
        // 处理不同的API响应格式
        if (data.data && Array.isArray(data.data)) {
            return data.data.map(model => model.id || model.name).filter(Boolean);
        } else if (Array.isArray(data)) {
            return data.map(model => model.id || model.name).filter(Boolean);
        } else if (data.models && Array.isArray(data.models)) {
            return data.models.map(model => model.id || model.name).filter(Boolean);
        }
        return [];
    }

    populateModelSelect(models) {
        const select = this.overlay.querySelector('.model-select');
        select.innerHTML = '<option value="">-- 选择模型 --</option>';
        
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            option.selected = model === this.currentConfig.selectedModel;
            select.appendChild(option);
        });

        this.availableModels = models;
    }

    saveSettings() {
        this.currentConfig.apiUrl = this.overlay.querySelector('.api-url').value;
        this.currentConfig.apiKey = this.overlay.querySelector('.api-key').value;
        this.currentConfig.selectedModel = this.overlay.querySelector('.model-select').value;
        this.currentConfig.targetLanguage = this.overlay.querySelector('.target-language').value;

        if (!this.currentConfig.apiUrl) {
            this.showStatus('请填写API地址', 'error');
            return;
        }

        this.saveConfig();
        this.toggleSettings(false);
        this.showStatus('设置已保存', 'success');
        
        // 更新模型信息显示
        const modelInfo = this.overlay.querySelector('.model-info');
        if (this.currentConfig.selectedModel) {
            modelInfo.textContent = `模型: ${this.currentConfig.selectedModel}`;
        }
    }

    async testConnection() {
        if (!this.currentConfig.apiUrl || !this.currentConfig.selectedModel) {
            this.showStatus('请先填写API信息和选择模型', 'error');
            return;
        }

        this.showStatus('测试连接中...', 'loading');

        try {
            const testText = 'Hello, world!';
            const translated = await this.translateText(testText);
            
            if (translated) {
                this.showStatus('连接测试成功!', 'success');
            } else {
                this.showStatus('翻译测试失败', 'error');
            }
        } catch (error) {
            this.showStatus(`连接测试失败: ${error.message}`, 'error');
        }
    }

    setupMessageListener() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && this.containsCharTag(node)) {
                        this.processMessage(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    containsCharTag(element) {
        return element.innerHTML && element.innerHTML.includes('<char>');
    }

    async processMessage(element) {
        if (!this.currentConfig.apiUrl || !this.currentConfig.selectedModel) {
            this.showStatus('请先配置API设置', 'error');
            return;
        }

        const charContent = this.extractCharContent(element.innerHTML);
        if (!charContent) return;

        this.showOriginalText(charContent);
        const translated = await this.translateText(charContent);
        if (translated) {
            this.showTranslatedText(translated);
        }
    }

    extractCharContent(html) {
        const regex = /<char>(.*?)<\/char>/gs;
        const matches = [...html.matchAll(regex)];
        return matches.map(match => match[1]).join('\n');
    }

    showOriginalText(text) {
        const originalElement = this.overlay.querySelector('.original-text');
        originalElement.textContent = text;
        this.showStatus('翻译中...', 'loading');
    }

    async translateText(text) {
        try {
            const response = await fetch(this.currentConfig.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.currentConfig.apiKey}`
                },
                body: JSON.stringify({
                    model: this.currentConfig.selectedModel,
                    messages: [
                        {
                            role: "system",
                            content: `你是一个专业的翻译助手。请将用户输入的内容翻译成${this.currentConfig.targetLanguage}，保持原文的风格和语气，只输出翻译结果。`
                        },
                        {
                            role: "user",
                            content: `请翻译以下内容：${text}`
                        }
                    ],
                    max_tokens: 1000,
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }

            const result = await response.json();
            const translatedText = result.choices?.[0]?.message?.content || 
                                 result.text || 
                                 result.result || 
                                 '翻译结果解析失败';

            this.showStatus('翻译完成', 'success');
            return translatedText;

        } catch (error) {
            console.error('翻译错误:', error);
            this.showStatus(`翻译失败: ${error.message}`, 'error');
            return null;
        }
    }

    showTranslatedText(text) {
        const translatedElement = this.overlay.querySelector('.translated-text');
        translatedElement.textContent = text;
    }

    showStatus(message, type = 'info') {
        const statusElement = this.overlay.querySelector('.status-text');
        statusElement.textContent = message;
        statusElement.className = `status-text ${type}`;
    }
}

// 自动初始化
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        new TranslationOverlayPro();
    });
}
