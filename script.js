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

    // 检查用户是否配置了翻译 API URL
    if (!customTranslationApiUrl) {
      console.warn("翻译插件：未配置翻译 API URL。请在设置中输入。");
      return "<span style='color: orange;'>[警告：未配置翻译服务 URL]</span>";
    }

    try {
      // 构建请求体：这部分取决于用户自定义的 API 期望的格式。
      // 以下是一个通用示例，假设 API 接收 JSON 格式的 { text: "待翻译文本", target_lang: "zh", ... }
      const requestBody = {
        text: textToTranslate,
        target_lang: "zh", // 假设默认翻译到中文，可以扩展到设置中让用户选择目标语言
        // source_lang: "auto", // 多数翻译服务支持自动检测源语言
      };

      // 构建请求头：如果用户配置了 API 密钥，将其添加到 Authorization 头中
      const requestHeaders = {
        "Content-Type": "application/json",
      };
      if (customTranslationApiKey) {
        requestHeaders["Authorization"] = `Bearer ${customTranslationApiKey}`; // 常见的 Bearer Token 形式
        // 如果你的 API 密钥不是这种形式，例如作为自定义头，你需要修改这里
        // requestHeaders["X-Api-Key"] = customTranslationApiKey;
      }

      // 发送网络请求
      const response = await fetch(customTranslationApiUrl, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // 尝试解析错误信息
        let errorInfo = `HTTP 错误: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData && errorData.message) {
            errorInfo += ` - ${errorData.message}`;
          }
        } catch (e) {
          // 如果无法解析 JSON 错误体，则保持原样
        }
        throw new Error(errorInfo);
      }

      const data = await response.json();

      // 解析翻译结果：这部分也取决于用户自定义的 API 返回格式。
      // 以下假设 API 返回 JSON 格式的 { translatedText: "翻译结果" }
      if (data && data.translatedText) {
        return data.translatedText;
      } else {
        console.warn("翻译插件：翻译服务响应格式不正确:", data);
        return "<span style='color: orange;'>[警告：翻译服务响应格式不正确]</span>";
      }

    } catch (error) {
      console.error("翻译插件：调用翻译 API 失败:", error);
      return `<span style='color: red;'>[翻译错误: ${error.message}]</span>`;
    }
  }

  // =========================================================================================
  // === 设置持久化功能 (保存/加载悬浮窗状态) ===================================================
  // =========================================================================================

  // 从 localStorage 加载设置
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

  // 保存设置到 localStorage
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

  // 创建翻译悬浮窗的 DOM 元素
  function createOverlay() {
    if (document.getElementById("translation-overlay")) return; // 防止重复创建

    overlay = document.createElement("div");
    overlay.id = "translation-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      top: "100px",
      right: "20px", // 初始右侧定位，加载设置后可能改变
      width: "320px",
      height: "400px",
      background: "rgba(30,30,30,0.95)",
      border: "1px solid #444",
      borderRadius: "8px",
      color: "#fff",
      zIndex: "9999", // 确保悬浮在其他内容之上
      display: "flex",
      flexDirection: "column",
      fontFamily: "sans-serif",
      boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
      resize: "both", // 允许用户调整大小
      overflow: "hidden", // 防止 resize 出现滚动条
      minWidth: "200px", // 最小宽度
      minHeight: "50px" // 最小高度（标题栏高度）
    });

    // 标题栏
    header = document.createElement("div");
    Object.assign(header.style, {
      cursor: "grab", // 拖动时鼠标手势
      background: "#222",
      padding: "5px 8px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: "1px solid #444",
      borderTopLeftRadius: "8px",
      borderTopRightRadius: "8px",
      userSelect: "none" // 防止拖动时选中文字
    });

    const title = document.createElement("span");
    title.innerText = "翻译悬浮窗";
    Object.assign(title.style, {
      fontWeight: "bold",
      fontSize: "14px",
      flexGrow: "1", // 标题占据剩余空间
      whiteSpace: "nowrap", // 防止标题换行
      overflow: "hidden",
      textOverflow: "ellipsis" // 文本溢出显示省略号
    });

    const controls = document.createElement("div");
    controls.innerHTML = `
      <button id="toggle-translation" aria-label="Toggle Translation"></button>
      <button id="open-settings" aria-label="Open Settings" title="打开设置">⚙️</button>
      <button id="minimize-overlay" aria-label="Minimize/Restore Overlay" title="最小化/恢复"></button>
      <button id="close-overlay" aria-label="Close Overlay" title="关闭悬浮窗">×</button>
    `;
    controls.querySelectorAll("button").forEach(btn => {
      Object.assign(btn.style, {
        marginLeft: "4px",
        cursor: "pointer",
        background: "#444",
        color: "#fff",
        border: "none",
        borderRadius: "4px",
        width: "28px",
        height: "24px",
        flexShrink: "0", // 防止按钮在小尺寸时挤压
        fontSize: "14px", // 调整按钮图标大小
        lineHeight: "1", // 垂直居中图标
        display: "flex", // 使用 flex 确保内容居中
        justifyContent: "center",
        alignItems: "center"
      });
      btn.onmouseover = () => btn.style.background = "#555";
      btn.onmouseout = () => btn.style.background = "#444";
    });

    header.appendChild(title);
    header.appendChild(controls);
    overlay.appendChild(header);

    // 内容区域
    content = document.createElement("div");
    content.id = "translation-content";
    Object.assign(content.style, {
      flex: "1",
      overflowY: "auto", // 仅垂直滚动
      padding: "8px",
      whiteSpace: "pre-wrap", // 保留换行和空格
      wordBreak: "break-word", // 单词内换行
      fontSize: "13px",
      lineHeight: "1.5",
      backgroundColor: "rgba(0,0,0,0.2)" // 轻微背景色区分
    });
    content.innerHTML = `<p style="color: #aaa;">🔧 翻译内容将显示在这里…<br>请在设置中配置翻译 API URL。</p>`;
    overlay.appendChild(content);

    document.body.appendChild(overlay);

    // 加载设置并更新 UI 状态
    loadSettings();
    updateOverlayUI();
    bindEvents();

    console.log("翻译悬浮窗插件已加载。");
  }

  // 根据当前设置更新 UI 状态（如按钮图标、内容显示）
  function updateOverlayUI() {
    const toggleBtn = document.getElementById("toggle-translation");
    const minimizeBtn = document.getElementById("minimize-overlay");

    // 更新翻译开关按钮
    if (isTranslationEnabled) {
      toggleBtn.innerText = "🔴";
      toggleBtn.title = "翻译已启用 (点击暂停)";
      // 如果当前内容是暂停提示，则清空以便接收新翻译
      if (content.innerText.includes("暂停")) {
        content.innerHTML = `<p style="color: #aaa;">▶️ 翻译已启用，等待新消息...</p>`;
      }
    } else {
      toggleBtn.innerText = "⚪";
      toggleBtn.title = "翻译已暂停 (点击启用)";
      content.innerHTML = `<p style="color: #aaa;">⏸️ 翻译已暂停</p>`;
    }

    // 更新最小化按钮和内容显示
    if (isMinimized) {
      content.style.display = "none";
      minimizeBtn.innerText = "□"; // 最小化时显示方框（恢复）图标
      overlay.style.height = "auto"; // 最小化时高度自适应
      overlay.style.borderBottomLeftRadius = "8px"; // 最小化时底部也圆角
      overlay.style.borderBottomRightRadius = "8px";
      overlay.style.overflow = "hidden"; // 隐藏可能出现的滚动条
    } else {
      content.style.display = "block";
      minimizeBtn.innerText = "−"; // 恢复时显示减号（最小化）图标
      // 恢复到上次保存的高度或默认高度
      if (localStorage.getItem(OVERLAY_STORAGE_KEY)) {
        const settings = JSON.parse(localStorage.getItem(OVERLAY_STORAGE_KEY));
        overlay.style.height = settings.height || "400px"; // 恢复保存的高度或默认高度
      } else {
        overlay.style.height = "400px";
      }
      overlay.style.borderBottomLeftRadius = "0"; // 恢复时底部取消圆角
      overlay.style.borderBottomRightRadius = "0";
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
      header.style.cursor = "grabbing"; // 拖动时改变鼠标样式
      e.preventDefault(); // 防止拖动时意外选中文字
    });
    document.addEventListener("mousemove", (e) => {
      if (isDragging) {
        overlay.style.left = `${e.clientX - offsetX}px`;
        overlay.style.top = `${e.clientY - offsetY}px`;
        overlay.style.right = "auto"; // 一旦拖动就解除右侧定位
      }
    });
    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        header.style.cursor = "grab"; // 恢复鼠标样式
        saveSettings(); // 拖动结束后保存位置
      }
    });

    // 监听 resize 事件以保存大小
    // 当 overlay 元素的大小发生变化时，保存设置
    const resizeObserver = new ResizeObserver(() => {
      saveSettings();
    });
    resizeObserver.observe(overlay);

    // 关闭按钮
    document.getElementById("close-overlay").onclick = () => {
      overlay.remove();
      localStorage.removeItem(OVERLAY_STORAGE_KEY); // 关闭时清除所有设置
      // 清理可能存在的事件监听器，如果 SillyTavern 提供了相应 API
      // if (window.SillyTavern && window.SillyTavern.events) {
      //    window.SillyTavern.events.off('newMessage', handleNewMessage);
      // }
      console.log("翻译悬浮窗插件已关闭。");
    };

    // 最小化按钮
    document.getElementById("minimize-overlay").onclick = () => {
      isMinimized = !isMinimized;
      updateOverlayUI(); // 更新 UI
      saveSettings(); // 保存最小化状态
    };

    // 设置按钮
    document.getElementById("open-settings").onclick = () => {
      // 确保你的 panel.html 文件在这个相对路径
      // 例如：SillyTavern安装目录/scripts/extensions/third-party/sillytavern-translation-overlay/panel.html
      const settingsPanelUrl = "/scripts/extensions/third-party/sillytavern-translation-overlay/panel.html";
      window.open(settingsPanelUrl, "_blank", "width=650,height=550");
      console.log("打开设置面板:", settingsPanelUrl);
    };

    // 开关翻译按钮
    document.getElementById("toggle-translation").onclick = () => {
      isTranslationEnabled = !isTranslationEnabled;
      updateOverlayUI(); // 更新 UI
      saveSettings(); // 保存开关状态

      if (isTranslationEnabled) {
        console.log("翻译功能已启用。");
        // 可以在这里添加启动监听 SillyTavern 消息的逻辑
        // simulateNewMessage("Hello, how are you doing today? This is a longer message to test the translation output.");
      } else {
        console.log("翻译功能已暂停。");
        // 可以在这里添加停止监听 SillyTavern 消息的逻辑
      }
    };

    // =========================================================================================
    // === SillyTavern 消息监听和翻译展示 (这是最需要你根据 SillyTavern 实际情况调整的部分) ============
    // =========================================================================================

    // 处理接收到的新消息并进行翻译展示
    async function handleNewMessage(messageText) {
      if (!isTranslationEnabled || isMinimized) return; // 如果翻译未启用或已最小化，则不处理

      // 清空初始提示信息
      if (content.innerHTML.includes("等待新消息") || content.innerHTML.includes("翻译内容将显示在这里")) {
          content.innerHTML = "";
      }

      const messageContainer = document.createElement("div");
      messageContainer.className = "translation-entry";
      Object.assign(messageContainer.style, {
        marginBottom: "10px",
        paddingBottom: "5px",
        borderBottom: "1px dotted #555",
        opacity: "0", // 初始透明度为0
        transition: "opacity 0.5s ease-in-out" // 添加过渡效果
      });

      // 添加原文
      const originalTextP = document.createElement("p");
      originalTextP.innerHTML = `<span style="color: #aaa; font-size: 11px; margin-bottom: 2px; display: block;">原文:</span>`;
      const originalContentSpan = document.createElement("span");
      originalContentSpan.innerText = messageText;
      Object.assign(originalContentSpan.style, {
          fontSize: "13px",
          color: "#eee"
      });
      originalTextP.appendChild(originalContentSpan);
      messageContainer.appendChild(originalTextP);

      // 添加一个加载提示
      const loadingP = document.createElement("p");
      loadingP.innerHTML = `<span style="color: #88f; font-size: 12px; font-style: italic;">翻译中...</span>`;
      messageContainer.appendChild(loadingP);


      content.prepend(messageContainer); // 将新消息添加到最顶部
      content.scrollTop = 0; // 保持滚动条在顶部

      // 渐显效果
      setTimeout(() => messageContainer.style.opacity = "1", 50);

      try {
        const translatedText = await translateText(messageText);
        if (translatedText) {
          loadingP.remove(); // 移除加载提示
          // 添加译文
          const translatedTextP = document.createElement("p");
          translatedTextP.innerHTML = `<span style="color: #7cb342; font-size: 11px; margin-top: 5px; margin-bottom: 2px; display: block;">译文:</span>`;
          const translatedContentSpan = document.createElement("span");
          translatedContentSpan.innerHTML = translatedText; // 使用 innerHTML 支持翻译 API 返回 HTML
          Object.assign(translatedContentSpan.style, {
              fontSize: "13px",
              color: "#e0ffe0",
              fontStyle: "italic"
          });
          translatedTextP.appendChild(translatedContentSpan);
          messageContainer.appendChild(translatedTextP);
        } else {
            loadingP.innerHTML = "<span style='color: orange; font-size: 12px; font-style: italic;'>未获取到翻译结果。</span>";
        }
      } catch (error) {
        loadingP.innerHTML = `<span style='color: red; font-size: 12px; font-style: italic;'>翻译失败: ${error.message || '未知错误'}</span>`;
        console.error("翻译插件：显示翻译结果时出错:", error);
      }
    }

    // =========================================================================================
    // !!! 如何从 SillyTavern 获取新消息是集成中最关键的部分 !!!
    // !!! 以下是几种可能的思路，你需要根据 SillyTavern 的实际情况选择并实现 !!!
    // =========================================================================================

    // 思路 1: 监听 DOM 变化 (MutationObserver)
    // 这种方法相对通用，但可能需要针对 SillyTavern 的聊天日志 DOM 结构进行精确选择
    const chatLog = document.getElementById('chat-log'); // 假设聊天记录容器的 ID 是 'chat-log'
    if (chatLog) {
        const observer = new MutationObserver(mutations => {
            if (!isTranslationEnabled) return; // 暂停时也停止监听DOM变化

            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        // 假设每条消息都是一个 div 或 p 元素，并且其文本是我们要翻译的
                        // 你可能需要根据实际的 SillyTavern DOM 结构调整选择器
                        if (node.nodeType === 1 && (node.classList.contains('message') || node.classList.contains('latest-message'))) {
                            // 提取消息文本
                            const messageText = node.innerText.trim();
                            if (messageText) {
                                // 过滤掉可能是系统消息或空消息
                                handleNewMessage(messageText);
                            }
                        }
                    });
                }
            });
        });

        // 监听 chatLog 元素的子节点变化
        observer.observe(chatLog, { childList: true, subtree: true });
        console.log("翻译插件：正在监听 SillyTavern 聊天日志 (MutationObserver)。");
    } else {
        console.warn("翻译插件：未找到 'chat-log' 元素，MutationObserver 无法启动。请检查 SillyTavern 的 DOM 结构或尝试其他集成方式。");
        // 如果找不到 chat-log，可以提示用户手动触发
        content.innerHTML = `<p style="color: red;">[错误] 无法找到聊天日志，无法自动翻译。<br>请检查 SillyTavern DOM 或尝试手动输入。</p>` + content.innerHTML;
    }


    // 思路 2: 如果 SillyTavern 暴露了自定义事件 (理想情况)
    // if (typeof window.SillyTavern === 'object' && window.SillyTavern.events) {
    //    window.SillyTavern.events.on('newMessage', (eventData) => {
    //        if (isTranslationEnabled && eventData && eventData.text) {
    //            handleNewMessage(eventData.text);
    //        }
    //    });
    //    console.log("翻译插件：正在监听 SillyTavern 的 'newMessage' 事件。");
    // }

    // 思路 3: 如果 SillyTavern 有一个全局函数可以获取最新消息 (不常见但可能)
    // setInterval(() => {
    //    if (isTranslationEnabled && typeof window.SillyTavern.getLatestMessage === 'function') {
    //        const latestMessage = window.SillyTavern.getLatestMessage();
    //        if (latestMessage && latestMessage.id !== lastProcessedMessageId) { // 避免重复处理
    //            handleNewMessage(latestMessage.text);
    //            lastProcessedMessageId = latestMessage.id;
    //        }
    //    }
    // }, 1000); // 每秒检查一次
  }

  // 启动时自动创建悬浮窗
  createOverlay();

})();
