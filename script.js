/**
 * SillyTavern 翻译悬浮窗插件
 * GitHub: https://github.com/yourusername/sillytavern-translation-overlay
 * 版本: 1.0.0
 */

(function() {
    'use strict';
    
    // 防止重复加载
    if (window.translationOverlayLoaded) {
        console.log('Translation Overlay already loaded');
        return;
    }
    window.translationOverlayLoaded = true;
    
    // 扩展主类
    class TranslationOverlayExtension {
        constructor() {
            this.name = 'translation-overlay';
            this.version = '1.0.0';
            this.isInitialized = false;
            this.overlay = null;
            this.settingsOpen = false;
            this.availableModels = [];
            
            // 默认配置
            this.config = {
                apiUrl: '',
                apiKey: '',
                selectedModel: '',
                targetLanguage: 'zh-CN',
                position: { x: 100, y: 100 },
                size: { width: 350, height: 250 },
                opacity: 0.95,
                enabled: true,
                autoTranslate: true
            };
        }
        
        async init() {
            try {
                console.log('Initializing Translation Overlay Extension...');
                
                // 等待SillyTavern加载完成
                await this.waitForSillyTavern();
                
                // 加载保存的配置
                await this.loadConfig();
                
                // 创建UI
                this.createOverlay();
                
                // 设置事件监听
                this.setupEventListeners();
                
                // 注册扩展
                this.registerExtension();
                
                this.isInitialized = true;
                console.log('✅ Translation Overlay Extension initialized successfully');
                
            } catch (error) {
                console.error('❌ Failed to initialize Translation Overlay Extension:', error);
            }
        }
        
        waitForSillyTavern() {
            return new Promise((resolve) => {
                let attempts = 0;
                const maxAttempts = 50; // 最多等待5秒
                
                const check = () => {
                    attempts++;
                    
                    // 检查SillyTavern核心元素
                    const isReady = document.querySelector('#chat') || 
                                   document.querySelector('#chat_container') ||
                                   typeof eventSource !== 'undefined';
                    
                    if (isReady || attempts >= maxAttempts) {
                        resolve();
                    } else {
                        setTimeout(check, 100);
                    }
                };
                
                check();
            });
        }
        
        async loadConfig() {
            try {
                const saved = localStorage.getItem('translationOverlayConfig');
                if (saved) {
                    const userConfig = JSON.parse(saved);
                    Object.assign(this.config, userConfig);
                }
            } catch (e) {
                console.warn('无法加载保存的配置，使用默认配置');
            }
        }
        
        saveConfig() {
            try {
                localStorage.setItem('translationOverlayConfig', JSON.stringify(this.config));
            } catch (e) {
                console.error('保存配置失败:', e);
            }
        }
        
        createOverlay() {
            // 移除已存在的实例
            const existing = document.getElementById('translation-overlay-st');
            if (existing) {
                existing.remove();
            }
            
            this.overlay = document.createElement('div');
            this.overlay.id = 'translation-overlay-st';
            this.overlay.innerHTML = this.getOverlayHTML();
            document.body.appendChild(this.overlay);
            
            this.applyStyles();
            this.makeDraggable();
            this.adjustInitialPosition();
        }
        
        getOverlayHTML() {
            return `
                <div class="translation-header">
                    <span class="translation-title">🔤 AI翻译器</span>
                    <div class="translation-controls">
                        <button class="control-btn toggle-enabled" title="${this.config.enabled ? '禁用' : '启用'}">
                            ${this.config.enabled ? '🔴' : '⚪'}
                        </button>
                        <button class="control-btn settings" title="设置">⚙️</button>
                        <button class="control-btn minimize">−</button>
                        <button class="control-btn close">×</button>
                    </div>
                </div>
                
                <div class="translation-content" style="display: ${this.settingsOpen ? 'none' : 'flex'}">
                    <div class="text-display">
                        <div class="original-section">
                            <label>原文:</label>
                            <div class="original-text">等待翻译内容...</div>
                        </div>
                        <div class="translated-section">
                            <label>翻译:</label>
                            <div class="translated-text">翻译结果将显示在这里</div>
                        </div>
                    </div>
                    <div class="translation-status">
                        <span class="status-text">${this.config.enabled ? '就绪' : '已禁用'}</span>
                        <span class="model-info">${this.config.selectedModel ? this.config.selectedModel : '未设置模型'}</span>
                    </div>
                </div>

                <div class="settings-panel" style="display: ${this.settingsOpen ? 'block' : 'none'}">
                    <div class="settings-header">
                        <h3>⚙️ API设置</h3>
                        <button class="control-btn close-settings">×</button>
                    </div>
                    <div class="settings-content">
                        <div class="input-group">
                            <label>API地址:</label>
                            <input type="text" class="api-url" placeholder="https://api.deepseek.com/chat/completions" 
                                   value="${this.config.apiUrl}">
                            <small>支持OpenAI兼容API</small>
                        </div>
                        
                        <div class="input-group">
                            <label>API密钥:</label>
                            <input type="password" class="api-key" placeholder="输入您的API密钥" 
                                   value="${this.config.apiKey}">
                        </div>
                        
                        <div class="input-group">
                            <label>目标语言:</label>
                            <select class="target-language">
                                <option value="zh-CN" ${this.config.targetLanguage === 'zh-CN' ? 'selected' : ''}>简体中文</option>
                                <option value="zh-TW" ${this.config.targetLanguage === 'zh-TW' ? 'selected' : ''}>繁体中文</option>
                                <option value="en" ${this.config.targetLanguage === 'en' ? 'selected' : ''}>English</option>
                                <option value="ja" ${this.config.targetLanguage === 'ja' ? 'selected' : ''}>日本語</option>
                                <option value="ko" ${this.config.targetLanguage === 'ko' ? 'selected' : ''}>한국어</option>
                            </select>
                        </div>
                        
                        <div class="input-group">
                            <label>模型选择:</label>
                            <div class="model-select-container">
                                <select class="model-select">
                                    <option value="">-- 请先获取模型 --</option>
                                    ${this.availableModels.map(model => 
                                        `<option value="${model}" ${model === this.config.selectedModel ? 'selected' : ''}>${model}</option>`
                                    ).join('')}
                                </select>
                                <button class="btn fetch-models">🔄 获取模型</button>
                            </div>
                        </div>
                        
                        <div class="settings-actions">
                            <button class="btn btn-primary save-settings">💾 保存设置</button>
                            <button class="btn btn-secondary test-connection">🔍 测试连接</button>
                        </div>
                        
                        <div class="settings-info">
                            <h4>使用说明:</h4>
                            <ul>
                                <li>支持OpenAI格式API (DeepSeek, OpenAI等)</li>
                                <li>自动检测并翻译&lt;char&gt;标签内容</li>
                                <li>设置会自动保存到浏览器本地存储</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `;
        }
        
        applyStyles() {
            Object.assign(this.overlay.style, {
                left: `${this.config.position.x}px`,
                top: `${this.config.position.y}px`,
                width: `${this.config.size.width}px`,
                height: `${this.config.size.height}px`,
                opacity: this.config.opacity,
                display: this.config.enabled ? 'block' : 'none'
            });
        }
        
        adjustInitialPosition() {
            // 默认放在右侧，避免遮挡聊天区域
            const chatContainer = document.querySelector('#chat_container, #chat');
            if (chatContainer) {
                const rect = chatContainer.getBoundingClientRect();
                this.config.position.x = Math.min(rect.right + 20, window.innerWidth - 400);
                this.config.position.y = Math.max(100, rect.top);
                this.applyStyles();
                this.saveConfig();
            }
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
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                
                const x = e.clientX - offset.x;
                const y = e.clientY - offset.y;
                
                // 限制在窗口范围内
                this.overlay.style.left = `${Math.max(0, Math.min(x, window.innerWidth - this.overlay.offsetWidth))}px`;
                this.overlay.style.top = `${Math.max(0, Math.min(y, window.innerHeight - this.overlay.offsetHeight))}px`;
            });

            document.addEventListener('mouseup', () => {
                if (!isDragging) return;
                
                isDragging = false;
                this.overlay.style.cursor = 'grab';
                this.config.position = {
                    x: this.overlay.offsetLeft,
                    y: this.overlay.offsetTop
                };
                this.saveConfig();
            });
        }
        
        setupEventListeners() {
            // 最小化按钮
            this.overlay.querySelector('.minimize').addEventListener('click', () => {
                const content = this.overlay.querySelector('.translation-content');
                content.style.display = content.style.display === 'none' ? 'flex' : 'none';
            });

            // 关闭按钮
            this.overlay.querySelector('.close').addEventListener('click', () => {
                this.config.enabled = false;
                this.overlay.style.display = 'none';
                this.saveConfig();
                this.updateToggleButton();
                this.showStatus('已关闭', 'info');
            });

            // 启用/禁用按钮
            this.overlay.querySelector('.toggle-enabled').addEventListener('click', () => {
                this.config.enabled = !this.config.enabled;
                this.overlay.style.display = this.config.enabled ? 'block' : 'none';
                this.saveConfig();
                this.updateToggleButton();
                this.showStatus(this.config.enabled ? '已启用' : '已禁用', 'info');
            });

            // 设置按钮
            this.overlay.querySelector('.settings').addEventListener('click', () => {
                this.toggleSettings(true);
            });

            this.overlay.querySelector('.close-settings').addEventListener('click', () => {
                this.toggleSettings(false);
            });

            // 设置面板功能
            this.setupSettingsPanel();
            
            // 监听SillyTavern消息
            this.setupMessageListener();
        }
        
        updateToggleButton() {
            const btn = this.overlay.querySelector('.toggle-enabled');
            if (btn) {
                btn.innerHTML = this.config.enabled ? '🔴' : '⚪';
                btn.title = this.config.enabled ? '禁用' : '启用';
            }
        }
        
        setupSettingsPanel() {
            // 获取模型按钮
            const fetchModelsBtn = this.overlay.querySelector('.fetch-models');
            if (fetchModelsBtn) {
                fetchModelsBtn.addEventListener('click', () => {
                    this.fetchAvailableModels();
                });
            }

            // 保存设置
            const saveSettingsBtn = this.overlay.querySelector('.save-settings');
            if (saveSettingsBtn) {
                saveSettingsBtn.addEventListener('click', () => {
                    this.saveSettings();
                });
            }

            // 测试连接
            const testConnectionBtn = this.overlay.querySelector('.test-connection');
            if (testConnectionBtn) {
                testConnectionBtn.addEventListener('click', () => {
                    this.testConnection();
                });
            }
        }
        
        toggleSettings(show) {
            this.settingsOpen = show;
            
            const settingsPanel = this.overlay.querySelector('.settings-panel');
            const content = this.overlay.querySelector('.translation-content');
            
            if (this.settingsOpen) {
                settingsPanel.style.display = 'block';
                content.style.display = 'none';
                this.overlay.style.width = '450px';
                this.overlay.style.height = '500px';
            } else {
                settingsPanel.style.display = 'none';
                content.style.display = 'flex';
                this.overlay.style.width = `${this.config.size.width}px`;
                this.overlay.style.height = `${this.config.size.height}px`;
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
                // 清理URL
                const baseUrl = apiUrl.replace(/\/chat\/completions$/, '');
                
                // 尝试不同的模型端点
                const endpoints = [
                    '/models',
                    '/v1/models',
                    '/api/models'
                ];

                let models = [];
                
                for (const endpoint of endpoints) {
                    try {
                        const modelUrl = baseUrl + endpoint;
                        console.log(`尝试获取模型从: ${modelUrl}`);
                        
                        const response = await fetch(modelUrl, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json'
                            }
                        });

                        if (response.ok) {
                            const data = await response.json();
                            models = this.extractModels(data);
                            console.log(`从 ${endpoint} 获取到模型:`, models);
                            if (models.length > 0) break;
                        } else {
                            console.warn(`端点 ${endpoint} 返回错误: ${response.status}`);
                        }
                    } catch (e) {
                        console.warn(`端点 ${endpoint} 请求失败:`, e);
                        continue;
                    }
                }

                if (models.length === 0) {
                    // 如果无法获取模型列表，提供一些常见模型
                    models = [
                        'gpt-3.5-turbo',
                        'gpt-4',
                        'gpt-4-turbo',
                        'deepseek-chat',
                        'deepseek-coder',
                        'claude-3-sonnet',
                        'claude-3-haiku'
                    ];
                    this.showStatus('使用默认模型列表', 'warning');
                } else {
                    this.showStatus(`获取到 ${models.length} 个模型`, 'success');
                }

                this.populateModelSelect(models);

            } catch (error) {
                console.error('获取模型失败:', error);
                this.showStatus('获取模型失败', 'error');
            }
        }
        
        extractModels(data) {
            if (!data) return [];
            
            // 处理不同的API响应格式
            if (data.data && Array.isArray(data.data)) {
                return data.data.map(model => model.id || model.name).filter(Boolean).sort();
            } else if (Array.isArray(data)) {
                return data.map(model => model.id || model.name).filter(Boolean).sort();
            } else if (data.models && Array.isArray(data.models)) {
                return data.models.map(model => model.id || model.name).filter(Boolean).sort();
            }
            return [];
        }
        
        populateModelSelect(models) {
            const select = this.overlay.querySelector('.model-select');
            if (!select) return;
            
            select.innerHTML = '<option value="">-- 选择模型 --</option>';
            
            models.forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                option.selected = model === this.config.selectedModel;
                select.appendChild(option);
            });

            this.availableModels = models;
        }
        
        saveSettings() {
            const apiUrl = this.overlay.querySelector('.api-url').value;
            const apiKey = this.overlay.querySelector('.api-key').value;
            const selectedModel = this.overlay.querySelector('.model-select').value;
            const targetLanguage = this.overlay.querySelector('.target-language').value;

            if (!apiUrl) {
                this.showStatus('请填写API地址', 'error');
                return;
            }

            this.config.apiUrl = apiUrl;
            this.config.apiKey = apiKey;
            this.config.selectedModel = selectedModel;
            this.config.targetLanguage = targetLanguage;

            this.saveConfig();
            this.toggleSettings(false);
            this.showStatus('设置已保存', 'success');
            
            // 更新模型信息显示
            const modelInfo = this.overlay.querySelector('.model-info');
            if (modelInfo && this.config.selectedModel) {
                modelInfo.textContent = this.config.selectedModel;
            }
        }
        
        async testConnection() {
            if (!this.config.apiUrl || !this.config.selectedModel) {
                this.showStatus('请先填写API信息和选择模型', 'error');
                return;
            }

            this.showStatus('测试连接中...', 'loading');

            try {
                const testText = 'Hello, world! This is a connection test.';
                const translated = await this.translateText(testText);
                
                if (translated && translated !== testText) {
                    this.showStatus('连接测试成功!', 'success');
                } else {
                    this.showStatus('翻译测试失败', 'error');
                }
            } catch (error) {
                this.showStatus(`连接测试失败: ${error.message}`, 'error');
            }
        }
        
        setupMessageListener() {
            // 使用MutationObserver监听DOM变化
            const observer = new MutationObserver((mutations) => {
                if (!this.config.enabled || !this.config.autoTranslate) return;
                
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) {
                            this.checkForCharContent(node);
                        }
                    });
                });
            });

            // 开始观察
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: false,
                attributes: false
            });
            
            console.log('消息监听器已启动');
        }
        
        checkForCharContent(element) {
            // 检查元素及其子元素是否包含<char>标签
            const walker = document.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            let node;
            while (node = walker.nextNode()) {
                if (node.parentNode && this.containsCharTag(node.parentNode)) {
                    this.processMessage(node.parentNode);
                    break;
                }
            }
        }
        
        containsCharTag(element) {
            return element.textContent && element.textContent.includes('<char>');
        }
        
        async processMessage(element) {
            if (!this.config.enabled || !this.config.apiUrl || !this.config.selectedModel) {
                return;
            }

            const charContent = this.extractCharContent(element.innerHTML || element.textContent);
            if (!charContent || charContent.length < 2) return;

            // 防抖处理，避免重复翻译
            if (this.lastTranslatedContent === charContent) return;
            this.lastTranslatedContent = charContent;

            this.showOriginalText(charContent);
            const translated = await this.translateText(charContent);
            if (translated) {
                this.showTranslatedText(translated);
            }
        }
        
        extractCharContent(html) {
            const regex = /<char>(.*?)<\/char>/gs;
            const matches = [...html.matchAll(regex)];
            const content = matches.map(match => match[1]).join('\n').trim();
            return content || null;
        }
        
        showOriginalText(text) {
            const originalElement = this.overlay.querySelector('.original-text');
            if (originalElement) {
                originalElement.textContent = text.length > 200 ? text.substring(0, 200) + '...' : text;
            }
            this.showStatus('翻译中...', 'loading');
        }
        
        async translateText(text) {
            if (!this.config.apiUrl || !this.config.selectedModel) {
                this.showStatus('请先配置API设置', 'error');
                return null;
            }

            try {
                const response = await fetch(this.config.apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.config.apiKey}`
                    },
                    body: JSON.stringify({
                        model: this.config.selectedModel,
                        messages: [
                            {
                                role: "system",
                                content: `你是一个专业的翻译助手。请将用户输入的内容翻译成${this.config.targetLanguage}，保持原文的风格和语气，只输出翻译结果。`
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
                    throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
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
            if (translatedElement) {
                translatedElement.textContent = text.length > 300 ? text.substring(0, 300) + '...' : text;
            }
        }
        
        showStatus(message, type = 'info') {
            const statusElement = this.overlay.querySelector('.status-text');
            if (statusElement) {
                statusElement.textContent = message;
                statusElement.className = `status-text ${type}`;
            }
        }
        
        registerExtension() {
            // 注册到SillyTavern扩展系统
            if (typeof window.extensions === 'object') {
                window.extensions[this.name] = this;
            }
            
            // 尝试注册到扩展管理器
            if (window.extensionManager && typeof window.extensionManager.register === 'function') {
                window.extensionManager.register(this);
            }
            
            console.log(`📚 ${this.name} v${this.version} 已注册`);
        }
        
        // 扩展生命周期方法
        onExtensionLoad() {
            console.log('Extension loaded by SillyTavern');
        }
        
        onExtensionUnload() {
            if (this.overlay) {
                this.overlay.remove();
            }
            console.log('Extension unloaded');
        }
    }
    
    // 延迟初始化，确保页面完全加载
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new TranslationOverlayExtension().init();
        });
    } else {
        setTimeout(() => {
            new TranslationOverlayExtension().init();
        }, 1000);
    }
    
})();
