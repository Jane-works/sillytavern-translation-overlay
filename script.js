class TranslationOverlay {
    constructor() {
        this.isInitialized = false;
        this.overlay = null;
        this.config = {
            apiUrl: '',
            apiKey: '',
            targetLanguage: 'zh-CN',
            position: { x: 100, y: 100 },
            size: { width: 300, height: 200 },
            opacity: 0.9
        };
        this.init();
    }

    async init() {
        await this.loadConfig();
        this.createOverlay();
        this.setupEventListeners();
        this.isInitialized = true;
        console.log('Translation Overlay initialized');
    }

    async loadConfig() {
        // 尝试加载用户配置
        try {
            const userConfig = await import('./config.js');
            Object.assign(this.config, userConfig.default || userConfig);
        } catch (e) {
            console.warn('使用默认配置，请创建config.js文件进行自定义配置');
        }
    }

    createOverlay() {
        // 创建悬浮窗容器
        this.overlay = document.createElement('div');
        this.overlay.id = 'translation-overlay';
        this.overlay.innerHTML = `
            <div class="translation-header">
                <span class="translation-title">AI翻译</span>
                <div class="translation-controls">
                    <button class="control-btn minimize">−</button>
                    <button class="control-btn close">×</button>
                </div>
            </div>
            <div class="translation-content">
                <div class="original-text"></div>
                <div class="translated-text"></div>
                <div class="translation-status">就绪</div>
            </div>
        `;

        document.body.appendChild(this.overlay);
        this.applyStyles();
        this.makeDraggable();
    }

    applyStyles() {
        // 样式将在style.css中定义，这里设置动态属性
        Object.assign(this.overlay.style, {
            left: `${this.config.position.x}px`,
            top: `${this.config.position.y}px`,
            width: `${this.config.size.width}px`,
            height: `${this.config.size.height}px`,
            opacity: this.config.opacity
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
            this.savePosition();
        });
    }

    setupEventListeners() {
        // 最小化按钮
        this.overlay.querySelector('.minimize').addEventListener('click', () => {
            const content = this.overlay.querySelector('.translation-content');
            content.style.display = content.style.display === 'none' ? 'block' : 'none';
        });

        // 关闭按钮
        this.overlay.querySelector('.close').addEventListener('click', () => {
            this.overlay.style.display = 'none';
        });

        // 监听SillyTavern的消息事件
        this.setupMessageListener();
    }

    setupMessageListener() {
        // 监听DOM变化，检测新消息
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
        const charContent = this.extractCharContent(element.innerHTML);
        if (!charContent) return;

        this.showOriginalText(charContent);
        await this.translateText(charContent);
    }

    extractCharContent(html) {
        const regex = /<char>(.*?)<\/char>/gs;
        const matches = [...html.matchAll(regex)];
        return matches.map(match => match[1]).join('\n');
    }

    showOriginalText(text) {
        const originalElement = this.overlay.querySelector('.original-text');
        originalElement.textContent = `原文: ${text}`;
        this.updateStatus('翻译中...');
    }

    async translateText(text) {
        try {
            if (!this.config.apiUrl) {
                throw new Error('请配置API地址');
            }

            const response = await fetch(this.config.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify({
                    text: text,
                    target_language: this.config.targetLanguage,
                    source_language: 'auto'
                })
            });

            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }

            const result = await response.json();
            this.showTranslatedText(result.translated_text || result.text);
            this.updateStatus('翻译完成');
            
        } catch (error) {
            console.error('翻译错误:', error);
            this.updateStatus(`错误: ${error.message}`);
        }
    }

    showTranslatedText(text) {
        const translatedElement = this.overlay.querySelector('.translated-text');
        translatedElement.textContent = `翻译: ${text}`;
    }

    updateStatus(status) {
        const statusElement = this.overlay.querySelector('.translation-status');
        statusElement.textContent = status;
    }

    savePosition() {
        this.config.position = {
            x: this.overlay.offsetLeft,
            y: this.overlay.offsetTop
        };
        // 这里可以添加保存到localStorage的逻辑
    }
}

// 自动初始化
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        new TranslationOverlay();
    });
}
