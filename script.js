// ==UserScript==
// @name         AI Translator Plugin for SillyTavern
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  AI回复抓取和翻译悬浮窗口 - 可以抓取<char>标签内容并实时翻译
// @author       YourName
// @match        http://localhost:8000/*
// @match        https://*.sillytavern.dev/*
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/draggable-js@1.0.0/draggable.min.js
// ==/UserScript==

(function() {
    'use strict';
    
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPlugin);
    } else {
        initPlugin();
    }
    
    function initPlugin() {
        // 等待SillyTavern完全加载
        if (!window.SillyTavern || !window.SillyTavern.getContext) {
            setTimeout(initPlugin, 1000);
            return;
        }
        
        // 创建插件实例
        const plugin = new AITranslatorPlugin();
        
        // 注册到SillyTavern插件系统
        if (window.SillyTavern && window.SillyTavern.pluginSystem) {
            window.SillyTavern.pluginSystem.registerPlugin(plugin);
        } else {
            // 直接初始化（兼容模式）
            plugin.init();
        }
    }
    
    class AITranslatorPlugin {
        constructor() {
            this.name = "AI Translator Plugin";
            this.version = "1.0.0";
            this.description = "AI回复抓取和翻译悬浮窗口";
            this.author = "YourName";
            this.settings = {};
            this.isEnabled = false;
            this.observer = null;
            this.floatingWindow = null;
            this.isMinimized = false;
        }
        
        async init() {
            try {
                console.log(`[${this.name}] 初始化中...`);
                
                await this.loadSettings();
                await this.createUI();
                this.setupEventListeners();
                this.setupChatObserver();
                
                this.isEnabled = true;
                console.log(`[${this.name}] v${this.version} 初始化完成`);
                
                // 显示欢迎消息
                this.showNotification('AI翻译插件', '插件已加载成功！');
            } catch (error) {
                console.error(`[${this.name}] 初始化失败:`, error);
            }
        }
        
        async loadSettings() {
            // 默认设置
            this.settings = {
                apiUrl: 'https://api.openai.com/v1',
                apiKey: '',
                selectedModel: 'gpt-3.5-turbo',
                translationLanguage: 'zh-CN',
                autoTranslate: true,
                showNotifications: true,
                translationDelay: 500,
                windowPosition: { x: 20, y: 20 }
            };
            
            // 尝试从SillyTavern设置加载
            try {
                const savedSettings = await this.getExtensionSettings();
                if (savedSettings) {
                    Object.assign(this.settings, savedSettings);
                }
            } catch (error) {
                console.warn('无法加载设置，使用默认值:', error);
            }
        }
        
        async createUI() {
            // 检查是否已存在窗口
            if (document.getElementById('ai-translator-window')) {
                console.log('悬浮窗口已存在，跳过创建');
                return;
            }
            
            // 创建悬浮窗口
            this.floatingWindow = document.createElement('div');
            this.floatingWindow.id = 'ai-translator-window';
            this.floatingWindow.className = 'ai-translator-floating-window';
            this.floatingWindow.innerHTML = this.getUIHTML();
            
            // 添加到页面
            document.body.appendChild(this.floatingWindow);
            
            // 应用保存的位置
            this.applySavedPosition();
            
            // 添加样式
            this.injectStyles();
            
            console.log('悬浮窗口创建成功');
        }
        
        getUIHTML() {
            return `
                <div class="ai-translator-container">
                    <div class="window-header" id="ai-translator-header">
                        <div class="window-title">
                            <span class="icon">🔤</span>
                            <span>AI翻译器</span>
                            <span class="status-indicator status-disconnected" id="status-indicator"></span>
                            <span id="status-text">未连接</span>
                        </div>
                        <div class="window-controls">
                            <button class="control-btn" id="minimize-btn" title="最小化">−</button>
                            <button class="control-btn" id="close-btn" title="关闭">×</button>
                        </div>
                    </div>
                    <div class="window-body" id="ai-translator-body">
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
                                <button class="btn btn-success" id="save-btn">
                                    <span class="icon">💾</span>
                                    <span>保存设置</span>
                                </button>
                                <button class="btn" id="test-btn">
                                    <span class="icon">🔌</span>
                                    <span>测试连接</span>
                                </button>
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
                                <button class="btn btn-secondary" id="clear-btn">
                                    <span class="icon">🗑️</span>
                                    <span>清空记录</span>
                                </button>
                                <button class="btn" id="auto-translate-btn">
                                    <span class="icon">${this.settings.autoTranslate ? '🔴' : '⚪'}</span>
                                    <span>自动翻译: ${this.settings.autoTranslate ? '开启' : '关闭'}</span>
                                </button>
                            </div>
                        </div>
                        
                        <div class="section">
                            <h3 class="section-title">快捷操作</h3>
                            <div class="buttons-row">
                                <button class="btn btn-secondary" id="translate-selected">
                                    <span class="icon">🔍</span>
                                    <span>翻译选中文本</span>
                                </button>
                                <button class="btn btn-secondary" id="toggle-window">
                                    <span class="icon">📌</span>
                                    <span>置顶窗口</span>
                                </button>
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
                {value: "claude-3-haiku", label: "Claude 3 Haiku"},
                {value: "custom", label: "自定义模型"}
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
        
        injectStyles() {
            // 如果样式已存在，则不重复添加
            if (document.getElementById('ai-translator-styles')) {
                return;
            }
            
            const style = document.createElement('style');
            style.id = 'ai-translator-styles';
            style.textContent = `
                .ai-translator-floating-window {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    width: 350px;
                    background-color: #2d3748;
                    border-radius: 10px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    overflow: hidden;
                    border: 1px solid #4a5568;
                    z-index: 10000;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    resize: both;
                    max-width: 90vw;
                    max-height: 90vh;
                    min-width: 300px;
                    min-height: 400px;
                }
                
                .ai-translator-container {
                    color: #e2e8f0;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }
                
                .window-header {
                    background-color: #4a5568;
                    padding: 12px 15px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: move;
                    user-select: none;
                }
                
                .window-title {
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                }
                
                .window-title .icon {
                    font-size: 16px;
                }
                
                .window-controls {
                    display: flex;
                    gap: 5px;
                }
                
                .control-btn {
                    background: none;
                    border: none;
                    color: #e2e8f0;
                    cursor: pointer;
                    font-size: 16px;
                    width: 24px;
                    height: 24px;
                    border-radius: 3px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background-color 0.2s;
                }
                
                .control-btn:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                }
                
                .window-body {
                    padding: 15px;
                    flex: 1;
                    overflow-y: auto;
                }
                
                .section {
                    margin-bottom: 20px;
                }
                
                .section-title {
                    font-size: 14px;
                    margin-bottom: 12px;
                    padding-bottom: 6px;
                    border-bottom: 1px solid #4a5568;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    color: #cbd5e0;
                }
                
                .form-group {
                    margin-bottom: 12px;
                }
                
                label {
                    display: block;
                    margin-bottom: 4px;
                    font-size: 13px;
                    color: #a0aec0;
                }
                
                input, select {
                    width: 100%;
                    padding: 8px 10px;
                    background-color: #4a5568;
                    border: 1px solid #718096;
                    border-radius: 5px;
                    color: #e2e8f0;
                    font-size: 13px;
                }
                
                input:focus, select:focus {
                    outline: none;
                    border-color: #4299e1;
                }
                
                .btn {
                    background-color: #4299e1;
                    color: white;
                    border: none;
                    padding: 8px 12px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 600;
                    transition: background-color 0.2s;
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    flex: 1;
                    justify-content: center;
                }
                
                .btn:hover {
                    background-color: #3182ce;
                }
                
                .btn-secondary {
                    background-color: #718096;
                }
                
                .btn-secondary:hover {
                    background-color: #4a5568;
                }
                
                .btn-success {
                    background-color: #48bb78;
                }
                
                .btn-success:hover {
                    background-color: #38a169;
                }
                
                .buttons-row {
                    display: flex;
                    gap: 8px;
                    margin-top: 15px;
                }
                
                .translation-area {
                    background-color: #2d3748;
                    border-radius: 5px;
                    padding: 12px;
                    margin-top: 15px;
                    border: 1px solid #4a5568;
                }
                
                .translation-text {
                    margin-bottom: 12px;
                }
                
                .translation-label {
                    font-size: 11px;
                    color: #a0aec0;
                    margin-bottom: 4px;
                }
                
                .translation-content {
                    background-color: #4a5568;
                    padding: 8px 10px;
                    border-radius: 5px;
                    min-height: 50px;
                    max-height: 120px;
                    overflow-y: auto;
                    border: 1px solid #718096;
                    font-size: 13px;
                    line-height: 1.4;
                }
                
                .status-indicator {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                }
                
                .status-connected {
                    background-color: #48bb78;
                }
                
                .status-disconnected {
                    background-color: #f56565;
                }
                
                .status-connecting {
                    background-color: #ed8936;
                    animation: pulse 1.5s infinite;
                }
                
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
                
                .ai-translator-floating-window.minimized .window-body {
                    display: none;
                }
                
                .ai-translator-floating-window.minimized {
                    height: auto;
                    min-height: auto;
                    width: 200px;
                }
                
                /* 响应式设计 */
                @media (max-width: 768px) {
                    .ai-translator-floating-window {
                        width: calc(100% - 40px);
                        left: 20px;
                        right: 20px;
                        top: 20px;
                    }
                }
            `;
            
            document.head.appendChild(style);
        }
        
        setupEventListeners() {
            // 保存设置按钮
            document.getElementById('save-btn').addEventListener('click', () => this.saveSettings());
            
            // 测试连接按钮
            document.getElementById('test-btn').addEventListener('click', () => this.testConnection());
            
            // 清空记录按钮
            document.getElementById('clear-btn').addEventListener('click', () => this.clearTranslations());
            
            // 自动翻译切换按钮
            document.getElementById('auto-translate-btn').addEventListener('click', () => this.toggleAutoTranslate());
            
            // 翻译选中文本按钮
            document.getElementById('translate-selected').addEventListener('click', () => this.translateSelectedText());
            
            // 置顶窗口按钮
            document.getElementById('toggle-window').addEventListener('click', () => this.toggleWindowPin());
            
            // 窗口控制按钮
            document.getElementById('minimize-btn').addEventListener('click', () => this.toggleMinimize());
            document.getElementById('close-btn').addEventListener('click', () => this.hideWindow());
            
            // 拖拽功能
            this.setupDraggable();
            
            console.log('事件监听器设置完成');
        }
        
        setupChatObserver() {
            // 等待聊天容器加载
            const findChatContainer = () => {
                const selectors = [
                    '#chat-container',
                    '.chat-container',
                    '[class*="chat"]',
                    '#message-container',
                    '.message-container'
                ];
                
                for (const selector of selectors) {
                    const element = document.querySelector(selector);
                    if (element) return element;
                }
                
                return document.body;
            };
            
            const chatContainer = findChatContainer();
            if (!chatContainer) {
                console.warn('未找到聊天容器，将在3秒后重试...');
                setTimeout(() => this.setupChatObserver(), 3000);
                return;
            }
            
            this.observer = new MutationObserver((mutations) => {
                if (!this.settings.autoTranslate || !this.isEnabled) return;
                
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
            
            console.log('聊天观察器设置完成');
        }
        
        async extractAndTranslate(node) {
            try {
                const htmlContent = node.innerHTML || node.textContent || '';
                const charMatches = htmlContent.match(/<char>(.*?)<\/char>/gi);
                
                if (charMatches) {
                    for (const match of charMatches) {
                        const text = match.replace(/<\/?char>/gi, '').trim();
                        if (text) {
                            const translated = await this.translateText(text);
                            this.displayTranslation(text, translated);
                            
                            if (this.settings.showNotifications) {
                                this.showNotification('翻译完成', `已翻译: ${text.substring(0, 50)}...`);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('提取和翻译错误:', error);
            }
        }
        
        async translateText(text) {
            if (!this.settings.apiUrl || !this.settings.apiKey || !this.settings.selectedModel) {
                return '请先配置API设置';
            }
            
            // 如果是自定义模型，需要特殊处理
            const model = this.settings.selectedModel === 'custom' ? 
                (this.settings.customModel || 'gpt-3.5-turbo') : 
                this.settings.selectedModel;
            
            try {
                const response = await fetch(`${this.settings.apiUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.settings.apiKey}`
                    },
                    body: JSON.stringify({
                        model: model,
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
                    const errorText = await response.text();
                    throw new Error(`API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
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
            
            // 自动滚动到最新内容
            originalElement.scrollTop = 0;
            translatedElement.scrollTop = 0;
        }
        
        async saveSettings() {
            try {
                this.settings.apiUrl = document.getElementById('api-url').value;
                this.settings.apiKey = document.getElementById('api-key').value;
                this.settings.selectedModel = document.getElementById('model-select').value;
                this.settings.translationLanguage = document.getElementById('language-select').value;
                
                // 保存到SillyTavern设置
                await this.saveExtensionSettings(this.settings);
                
                this.updateStatus('设置已保存', 'success');
                this.showNotification('设置已保存', 'API配置已更新');
            } catch (error) {
                console.error('保存设置失败:', error);
                this.updateStatus('保存失败', 'error');
            }
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
                    
                    this.showNotification('连接成功', 'API连接测试通过');
                } else {
                    throw new Error(`API返回错误: ${response.status}`);
                }
            } catch (error) {
                console.error('连接测试失败:', error);
                this.updateStatus('连接失败: ' + error.message, 'error');
                this.showNotification('连接失败', '请检查API设置');
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
            const icon = button.querySelector('.icon');
            
            icon.textContent = this.settings.autoTranslate ? '🔴' : '⚪';
            button.querySelector('span:last-child').textContent = 
                `自动翻译: ${this.settings.autoTranslate ? '开启' : '关闭'}`;
            
            this.saveExtensionSettings(this.settings);
            
            this.showNotification(
                '自动翻译', 
                `已${this.settings.autoTranslate ? '开启' : '关闭'}自动翻译功能`
            );
        }
        
        async translateSelectedText() {
            const selectedText = window.getSelection().toString().trim();
            if (!selectedText) {
                this.showNotification('翻译失败', '请先选择要翻译的文本');
                return;
            }
            
            try {
                const translated = await this.translateText(selectedText);
                this.displayTranslation(selectedText, translated);
                this.showNotification('翻译完成', '选中文本已翻译');
            } catch (error) {
                console.error('翻译选中文本失败:', error);
                this.showNotification('翻译失败', '请检查API设置');
            }
        }
        
        toggleWindowPin() {
            const isPinned = this.floatingWindow.style.zIndex === '10001';
            this.floatingWindow.style.zIndex = isPinned ? '10000' : '10001';
            
            const button = document.getElementById('toggle-window');
            const icon = button.querySelector('.icon');
            icon.textContent = isPinned ? '📌' : '📍';
            
            this.showNotification(
                '窗口置顶', 
                `窗口已${isPinned ? '取消置顶' : '置顶'}`
            );
        }
        
        toggleMinimize() {
            this.isMinimized = !this.isMinimized;
            this.floatingWindow.classList.toggle('minimized', this.isMinimized);
            
            const button = document.getElementById('minimize-btn');
            button.textContent = this.isMinimized ? '+' : '−';
            button.title = this.isMinimized ? '展开' : '最小化';
        }
        
        hideWindow() {
            this.floatingWindow.style.display = 'none';
            
            // 创建重新打开按钮
            this.createReopenButton();
        }
        
        createReopenButton() {
            // 如果已存在重新打开按钮，则不创建
            if (document.getElementById('ai-translator-reopen')) {
                return;
            }
            
            const reopenBtn = document.createElement('button');
            reopenBtn.id = 'ai-translator-reopen';
            reopenBtn.innerHTML = '🔤 AI翻译';
            reopenBtn.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                background: #4299e1;
                color: white;
                border: none;
                border-radius: 20px;
                padding: 8px 16px;
                cursor: pointer;
                font-size: 12px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            `;
            
            reopenBtn.addEventListener('click', () => {
                this.floatingWindow.style.display = 'block';
                reopenBtn.remove();
            });
            
            document.body.appendChild(reopenBtn);
        }
        
        setupDraggable() {
            const header = document.getElementById('ai-translator-header');
            let isDragging = false;
            let dragOffset = { x: 0, y: 0 };
            
            header.addEventListener('mousedown', (e) => {
                if (e.target.tagName === 'BUTTON') return;
                
                isDragging = true;
                const rect = this.floatingWindow.getBoundingClientRect();
                dragOffset.x = e.clientX - rect.left;
                dragOffset.y = e.clientY - rect.top;
                this.floatingWindow.style.cursor = 'grabbing';
                
                e.preventDefault();
            });
            
            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                
                this.floatingWindow.style.left = (e.clientX - dragOffset.x) + 'px';
                this.floatingWindow.style.top = (e.clientY - dragOffset.y) + 'px';
                this.floatingWindow.style.right = 'auto';
            });
            
            document.addEventListener('mouseup', () => {
                if (!isDragging) return;
                
                isDragging = false;
                this.floatingWindow.style.cursor = '';
                this.saveWindowPosition();
            });
        }
        
        saveWindowPosition() {
            const rect = this.floatingWindow.getBoundingClientRect();
            this.settings.windowPosition = { x: rect.left, y: rect.top };
            this.saveExtensionSettings(this.settings);
        }
        
        applySavedPosition() {
            if (this.settings.windowPosition) {
                this.floatingWindow.style.left = this.settings.windowPosition.x + 'px';
                this.floatingWindow.style.top = this.settings.windowPosition.y + 'px';
                this.floatingWindow.style.right = 'auto';
            }
        }
        
        showNotification(title, message) {
            // 使用浏览器通知API（如果可用）
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(title, { 
                    body: message,
                    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDIyQzE3LjUyMjggMjIgMjIgMTcuNTIyOCAyMiAxMkMyMiA2LjQ3NzE1IDE3LjUyMjggMiAxMiAyQzYuNDc3MTUgMiAyIDYuNDc3MTUgMiAxMkMyIDE3LjUyMjggNi40NzcxNSAyMiAxMiAyMloiIGZpbGw9IiM0Mjl5ZTEiLz4KPHBhdGggZD0iTTEyIDE2VjEyTTEyIDhIMTIuMDEiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo='
                });
            } else {
                // 回退到控制台日志
                console.log(`[${title}] ${message}`);
            }
        }
        
        // SillyTavern插件API方法
        async getExtensionSettings() {
            return new Promise((resolve) => {
                if (window.SillyTavern && window.SillyTavern.getExtensionSettings) {
                    window.SillyTavern.getExtensionSettings(this.name).then(resolve);
                } else {
                    // 回退到localStorage
                    const saved = localStorage.getItem(`aiTranslator_settings`);
                    resolve(saved ? JSON.parse(saved) : null);
                }
            });
        }
        
        async saveExtensionSettings(settings) {
            return new Promise((resolve) => {
                if (window.SillyTavern && window.SillyTavern.saveExtensionSettings) {
                    window.SillyTavern.saveExtensionSettings(this.name, settings).then(resolve);
                } else {
                    // 回退到localStorage
                    localStorage.setItem(`aiTranslator_settings`, JSON.stringify(settings));
                    resolve();
                }
            });
        }
        
        // 插件生命周期方法
        onEnable() {
            this.init();
        }
        
        onDisable() {
            this.isEnabled = false;
            if (this.observer) {
                this.observer.disconnect();
            }
            if (this.floatingWindow) {
                this.floatingWindow.style.display = 'none';
            }
        }
        
        onSettingsUpdate(settings) {
            Object.assign(this.settings, settings);
            this.updateUIFromSettings();
        }
        
        updateUIFromSettings() {
            if (!this.floatingWindow) return;
            
            document.getElementById('api-url').value = this.settings.apiUrl || '';
            document.getElementById('api-key').value = this.settings.apiKey || '';
            document.getElementById('model-select').value = this.settings.selectedModel || 'gpt-3.5-turbo';
            document.getElementById('language-select').value = this.settings.translationLanguage || 'zh-CN';
            
            const autoTranslateBtn = document.getElementById('auto-translate-btn');
            if (autoTranslateBtn) {
                const icon = autoTranslateBtn.querySelector('.icon');
                icon.textContent = this.settings.autoTranslate ? '🔴' : '⚪';
                autoTranslateBtn.querySelector('span:last-child').textContent = 
                    `自动翻译: ${this.settings.autoTranslate ? '开启' : '关闭'}`;
            }
        }
    }
})();
