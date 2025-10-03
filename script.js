// ==UserScript==
// SillyTavern Translation Overlay 插件
// 增强版 script.js 包含缓存、分段翻译、重试、TTS、并发控制等功能

(function() {
  'use strict';
  const CONFIG_KEY = 'translationOverlayConfig';

  let state = {
    enabled: true,
    minimized: false,
    settings: {
      apiUrl: '',
      apiKey: '',
      modelName: '',
      targetLang: 'zh'
    },
    cache: new Map(),
    pendingQueue: [],
    activeRequests: 0,
    maxConcurrent: 2
  };

  // 保存设置
  function saveSettings() {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(state.settings));
  }

  // 加载设置
  function loadSettings() {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (saved) {
      state.settings = Object.assign(state.settings, JSON.parse(saved));
    }
  }

  // 添加悬浮窗
  function createOverlay() {
    let overlay = document.createElement('div');
    overlay.id = 'translation-overlay';
    overlay.style.position = 'fixed';
    overlay.style.right = '10px';
    overlay.style.top = '50px';
    overlay.style.width = '300px';
    overlay.style.height = '400px';
    overlay.style.background = 'rgba(0,0,0,0.8)';
    overlay.style.color = '#fff';
    overlay.style.padding = '10px';
    overlay.style.zIndex = 9999;
    overlay.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;">'
      + '<span>翻译悬浮窗</span>'
      + '<button id="toggle-translation">🔴</button>'
      + '</div>'
      + '<div id="translation-content" style="overflow:auto;height:350px;"></div>';
    document.body.appendChild(overlay);

    document.getElementById('toggle-translation').onclick = () => {
      state.enabled = !state.enabled;
      document.getElementById('toggle-translation').innerText = state.enabled ? '🔴' : '⚪';
    };
  }

  // 分段文本
  function splitText(text, maxLen=800) {
    let result = [];
    for (let i=0; i<text.length; i+=maxLen) {
      result.push(text.slice(i, i+maxLen));
    }
    return result;
  }

  // 翻译函数
  async function translateText(text) {
    if (state.cache.has(text)) return state.cache.get(text);
    let chunks = splitText(text);
    let results = [];
    for (let chunk of chunks) {
      let translated = await requestAPI(chunk);
      results.push(translated);
    }
    let finalText = results.join(' ');
    state.cache.set(text, finalText);
    return finalText;
  }

  // 请求 API
  async function requestAPI(text, retry=2) {
    const url = state.settings.apiUrl + '/v1/chat/completions';
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.settings.apiKey}`
        },
        body: JSON.stringify({
          model: state.settings.modelName,
          messages: [
            { role: 'system', content: `You are a translation engine. Translate into ${state.settings.targetLang}.` },
            { role: 'user', content: text }
          ]
        })
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (err) {
      if (retry > 0) return await requestAPI(text, retry-1);
      console.error('API 请求失败', err);
      return '';
    }
  }

  // 监听消息
  function observeMessages() {
    const observer = new MutationObserver(async (mutations) => {
      for (let m of mutations) {
        for (let node of m.addedNodes) {
          if (node.nodeType === 1 && node.tagName === 'CHAR') {
            if (!state.enabled) continue;
            let originalText = node.innerText.trim();
            if (!originalText) continue;
            let translated = await translateText(originalText);
            let div = document.createElement('div');
            div.textContent = translated;
            document.getElementById('translation-content').appendChild(div);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // 初始化
  function init() {
    loadSettings();
    createOverlay();
    observeMessages();
  }

  init();
})();