(function () {
  let overlay, header, content;
  let isDragging = false, offsetX, offsetY;
  let isMinimized = false; // 悬浮窗是否最小化
  let isTranslationEnabled = true; // 翻译功能是否启用
  let customTranslationApiUrl = ""; // 用户配置的翻译 API URL
  let customTranslationApiKey = ""; // 用户配置的翻译 API 密钥 (可选)

  // 用于 localStorage 的键，必须与 panel.js 中的一致
  const OVERLAY_STORAGE_KEY = "translationOverlaySettings";

  // =========================================================================================
  // === 核心翻译逻辑 (需要根据用户配置的 API 进行实际替换) =========================================
  // =========================================================================================
  async function translateText(textToTranslate) {
    if (!textToTranslate || textToTranslate.trim() === "") return "";

    if (!customTranslationApiUrl) {
      console.warn("翻译插件：未配置翻译 API URL。请在设置中输入。");
      return "<span class='translation-warning'>[警告：未配置翻译服务 URL]</span>";
    }

    try {
      const requestBody = {
        text: textToTranslate,
        target_lang: "zh", // 可以扩展到设置中让用户选择目标语言
      };

      const requestHeaders = {
        "Content-Type": "application/json",
      };
      if (customTranslationApiKey) {
        requestHeaders["Authorization"] = `Bearer ${customTranslationApiKey}`;
      }

      const response = await fetch(customTranslationApiUrl, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorInfo = `HTTP 错误: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData && errorData.message) {
            errorInfo += ` - ${errorData.message}`;
          }
        } catch (e) { /* ignore */ }
        throw new Error(errorInfo);
      }

      const data = await response.json();

      if (data && data.translatedText) {
        return data.translatedText;
      } else {
        console.warn("翻译插件：翻译服务响应格式不正确:", data);
        return "<span class='translation-warning'>[警告：翻译服务响应格式不正确]</span>";
      }

    } catch (error) {
      console.error("翻译插件：调用翻译 API 失败:", error);
      return `<span class='translation-error'>[翻译错误: ${error.message}]</span>`;
    }
  }

  // =========================================================================================
  // === 设置持久化功能 (保存/加载悬浮窗状态) ===================================================
  // =========================================================================================

  function loadSettings() {
    try {
      const settings = JSON.parse(localStorage.getItem(OVERLAY_STORAGE_KEY));
      if (settings) {
        // 加载位置和大小
        if (settings.left !== undefined) overlay.style.left = settings.left;
        if (settings.top !== undefined) overlay.style.top = settings.top;
        if (settings.width !== undefined) overlay.style.width = settings.width;
        if (settings.height !== undefined) overlay.style.height = settings.height;
        // 加载状态
        isMinimized = settings.isMinimized || false;
        isTranslationEnabled = settings.isTranslationEnabled !== undefined ? settings.isTranslationEnabled : true;
        // 加载用户自定义的 API 设置
        customTranslationApiUrl = settings.customTranslationApiUrl || "";
        customTranslationApiKey = settings.customTranslationApiKey || "";
      }
    } catch (e) {
      console.error("翻译插件：加载设置失败:", e);
    }
  }

  function saveSettings() {
    const settings = {
      left: overlay.style.left,
      top: overlay.style.top,
      width: overlay.style.width,
      height: overlay.style.height,
      isMinimized: isMinimized,
      isTranslationEnabled: isTranslationEnabled,
      customTranslationApiUrl: customTranslationApiUrl,
      customTranslationApiKey: customTranslationApiKey,
    };
    localStorage.setItem(OVERLAY_STORAGE_KEY, JSON.stringify(settings));
  }

  // =========================================================================================
  // === UI 创建与更新 ========================================================================
  // =========================================================================================

  function createOverlay() {
    if (document.getElementById("translation-overlay")) return;

    overlay = document.createElement("div");
    overlay.id = "translation-overlay";
    // 初始位置和大小，会被 localStorage 覆盖
    overlay.style.top = "100px";
    overlay.style.right = "20px";
    overlay.style.width = "320px";
    overlay.style.height = "400px";

    header = document.createElement("div");
    header.className = "overlay-header";

    const title = document.createElement("span");
    title.className = "overlay-title";
    title.innerText = "翻译悬浮窗";

    const controls = document.createElement("div");
    controls.className = "overlay-controls";
    controls.innerHTML = `
      <button id="toggle-translation" class="control-btn" aria-label="Toggle Translation"></button>
      <button id="open-settings" class="control-btn" aria-label="Open Settings" title="打开设置">⚙️</button>
      <button id="minimize-overlay" class="control-btn" aria-label="Minimize/Restore Overlay" title="最小化/恢复"></button>
      <button id="close-overlay" class="control-btn" aria-label="Close Overlay" title="关闭悬浮窗">×</button>
    `;

    header.appendChild(title);
    header.appendChild(controls);
    overlay.appendChild(header);

    content = document.createElement("div");
    content.id = "translation-content";
    content.innerHTML = `<p class="initial-message">🔧 翻译内容将显示在这里…<br>请在设置中配置翻译 API URL。</p>`;
    overlay.appendChild(content);

    document.body.appendChild(overlay);

    loadSettings();
    updateOverlayUI();
    bindEvents();

    console.log("翻译悬浮窗插件已加载。");
  }

  function updateOverlayUI() {
    const toggleBtn = document.getElementById("toggle-translation");
    const minimizeBtn = document.getElementById("minimize-overlay");

    // 更新翻译开关按钮
    if (isTranslationEnabled) {
      toggleBtn.innerText = "🔴";
      toggleBtn.title = "翻译已启用 (点击暂停)";
      // 如果当前内容是暂停提示，则清空以便接收新翻译
      if (content.querySelector('.initial-message') || content.innerText.includes("暂停")) {
        content.innerHTML = `<p class="initial-message">▶️ 翻译已启用，等待新消息...</p>`;
      }
    } else {
      toggleBtn.innerText = "⚪";
      toggleBtn.title = "翻译已暂停 (点击启用)";
      content.innerHTML = `<p class="initial-message">⏸️ 翻译已暂停</p>`;
    }

    // 更新最小化按钮和内容显示
    if (isMinimized) {
      overlay.classList.add("minimized");
      minimizeBtn.innerText = "□"; // 最小化时显示方框（恢复）图标
    } else {
      overlay.classList.remove("minimized");
      minimizeBtn.innerText = "−"; // 恢复时显示减号（最小化）图标
      // 如果从最小化恢复，并且没有自定义高度，恢复默认高度
      if (!overlay.style.height || overlay.style.height === "auto") {
         overlay.style.height = "400px";
      }
    }
  }

  // =========================================================================================
  // === 事件绑定与处理 =======================================================================
  // =========================================================================================

  function bindEvents() {
    // 拖动逻辑
    header.addEventListener("mousedown", (e) => {
      isDragging = true;
      offsetX = e.clientX - overlay.getBoundingClientRect().left;
      offsetY = e.clientY - overlay.getBoundingClientRect().top;
      header.classList.add("dragging"); // 添加拖动样式
      e.preventDefault();
    });
    document.addEventListener("mousemove", (e) => {
      if (isDragging) {
        overlay.style.left = `${e.clientX - offsetX}px`;
        overlay.style.top = `${e.clientY - offsetY}px`;
        overlay.style.right = "auto";
      }
    });
    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        header.classList.remove("dragging"); // 移除拖动样式
        saveSettings();
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      // 只有在非最小化状态下才保存高度，因为最小化时高度是 auto
      if (!isMinimized) {
          saveSettings();
      }
    });
    resizeObserver.observe(overlay);

    document.getElementById("close-overlay").onclick = () => {
      overlay.remove();
      localStorage.removeItem(OVERLAY_STORAGE_KEY);
      console.log("翻译悬浮窗插件已关闭。");
    };

    document.getElementById("minimize-overlay").onclick = () => {
      isMinimized = !isMinimized;
      updateOverlayUI();
      saveSettings();
    };

    document.getElementById("open-settings").onclick = () => {
      const settingsPanelUrl = "/scripts/extensions/third-party/sillytavern-translation-overlay/panel.html";
      window.open(settingsPanelUrl, "_blank", "width=650,height=550");
      console.log("打开设置面板:", settingsPanelUrl);
    };

    document.getElementById("toggle-translation").onclick = () => {
      isTranslationEnabled = !isTranslationEnabled;
      updateOverlayUI();
      saveSettings();

      if (isTranslationEnabled) {
        console.log("翻译功能已启用。");
      } else {
        console.log("翻译功能已暂停。");
      }
    };

    // =========================================================================================
    // === SillyTavern 消息监听和翻译展示 ===================================================
    // =========================================================================================

    async function handleNewMessage(messageText) {
      if (!isTranslationEnabled || isMinimized) return;

      // 清空初始提示信息
      if (content.querySelector('.initial-message')) {
          content.innerHTML = "";
      }

      const messageEntry = document.createElement("div");
      messageEntry.className = "translation-entry";

      const originalTextP = document.createElement("p");
      originalTextP.className = "original-text";
      originalTextP.innerHTML = `<span class="label">原文:</span><span class="text">${messageText}</span>`;
      messageEntry.appendChild(originalTextP);

      const loadingP = document.createElement("p");
      loadingP.className = "translation-loading";
      loadingP.innerHTML = `<span class="label">译文:</span><span class="text italic">翻译中...</span>`;
      messageEntry.appendChild(loadingP);

      content.prepend(messageEntry);
      content.scrollTop = 0; // 保持滚动条在顶部

      try {
        const translatedText = await translateText(messageText);
        loadingP.remove(); // 移除加载提示

        const translatedTextP = document.createElement("p");
        translatedTextP.className = "translated-text";
        translatedTextP.innerHTML = `<span class="label">译文:</span><span class="text italic">${translatedText}</span>`;
        messageEntry.appendChild(translatedTextP);

      } catch (error) {
        loadingP.className = "translation-error-message";
        loadingP.innerHTML = `<span class="label">译文:</span><span class="text italic">${error.message || '翻译失败'}</span>`;
        console.error("翻译插件：显示翻译结果时出错:", error);
      }
    }

    const chatLog = document.getElementById('chat-log'); // 假设聊天记录容器的 ID 是 'chat-log'
    if (chatLog) {
        const observer = new MutationObserver(mutations => {
            if (!isTranslationEnabled) return;

            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        // 假设每条消息都是一个带有特定 class 的 div 或 p 元素
                        // 你可能需要根据实际的 SillyTavern DOM 结构调整选择器
                        if (node.nodeType === 1 && (node.classList.contains('message') || node.classList.contains('latest-message') || node.classList.contains('mes_text'))) {
                            const messageText = node.innerText.trim();
                            if (messageText && !messageText.startsWith("正在加载...") && !node.classList.contains('user_name')) { // 过滤掉可能是系统消息、加载文本或用户名自身
                                handleNewMessage(messageText);
                            }
                        }
                    });
                }
            });
        });

        observer.observe(chatLog, { childList: true, subtree: true });
        console.log("翻译插件：正在监听 SillyTavern 聊天日志 (MutationObserver)。");
    } else {
        console.warn("翻译插件：未找到 'chat-log' 元素，MutationObserver 无法启动。请检查 SillyTavern 的 DOM 结构或尝试其他集成方式。");
        content.innerHTML = `<p class="initial-message translation-error">[错误] 无法找到聊天日志，无法自动翻译。<br>请检查 SillyTavern DOM 或尝试手动输入。</p>` + content.innerHTML;
    }
  }

  createOverlay();

})();
