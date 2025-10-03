(function () {
  let overlay, header, content, isDragging = false, offsetX, offsetY, isMinimized = false, isTranslationEnabled = true;

  const OVERLAY_STORAGE_KEY = "translationOverlaySettings";

  // 用于模拟翻译的函数
  // !!! 你需要将此函数替换为调用实际翻译API的逻辑 !!!
  async function translateText(text) {
    if (!text || text.trim() === "") return "";
    console.log("模拟翻译文本:", text);
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 500));
    // 模拟翻译结果，可以替换为调用 Google Translate API, DeepL API 等
    return `[译] ${text.slice(0, 50)}${text.length > 50 ? '...' : ''} (模拟翻译)`;
  }

  // 从localStorage加载设置
  function loadSettings() {
    try {
      const settings = JSON.parse(localStorage.getItem(OVERLAY_STORAGE_KEY));
      if (settings) {
        if (settings.left !== undefined) overlay.style.left = settings.left;
        if (settings.top !== undefined) overlay.style.top = settings.top;
        if (settings.width !== undefined) overlay.style.width = settings.width;
        if (settings.height !== undefined) overlay.style.height = settings.height;
        isMinimized = settings.isMinimized || false;
        isTranslationEnabled = settings.isTranslationEnabled !== undefined ? settings.isTranslationEnabled : true;
      }
    } catch (e) {
      console.error("Failed to load overlay settings:", e);
    }
  }

  // 保存设置到localStorage
  function saveSettings() {
    const settings = {
      left: overlay.style.left,
      top: overlay.style.top,
      width: overlay.style.width,
      height: overlay.style.height,
      isMinimized: isMinimized,
      isTranslationEnabled: isTranslationEnabled,
    };
    localStorage.setItem(OVERLAY_STORAGE_KEY, JSON.stringify(settings));
  }

  function createOverlay() {
    // 如果已存在就不重复创建
    if (document.getElementById("translation-overlay")) return;

    overlay = document.createElement("div");
    overlay.id = "translation-overlay";
    overlay.style.position = "fixed";
    overlay.style.top = "100px";
    overlay.style.right = "20px"; // 初始右侧定位，加载设置后可能改变
    overlay.style.width = "320px";
    overlay.style.height = "400px";
    overlay.style.background = "rgba(30,30,30,0.95)";
    overlay.style.border = "1px solid #444";
    overlay.style.borderRadius = "8px";
    overlay.style.color = "#fff";
    overlay.style.zIndex = 9999;
    overlay.style.display = "flex";
    overlay.style.flexDirection = "column";
    overlay.style.fontFamily = "sans-serif";
    overlay.style.boxShadow = "0 4px 12px rgba(0,0,0,0.5)";
    overlay.style.resize = "both"; // 允许用户调整大小
    overlay.style.overflow = "hidden"; // 防止 resize 出现滚动条

    // 标题栏
    header = document.createElement("div");
    header.style.cursor = "move";
    header.style.background = "#222";
    header.style.padding = "5px 8px";
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.style.borderBottom = "1px solid #444";
    header.style.borderTopLeftRadius = "8px"; // 圆角
    header.style.borderTopRightRadius = "8px"; // 圆角

    const title = document.createElement("span");
    title.innerText = "翻译悬浮窗";
    title.style.fontWeight = "bold";
    title.style.fontSize = "14px";

    const controls = document.createElement("div");
    controls.innerHTML = `
      <button id="toggle-translation" aria-label="Toggle Translation"></button>
      <button id="open-settings" aria-label="Open Settings">⚙️</button>
      <button id="minimize-overlay" aria-label="Minimize/Restore Overlay"></button>
      <button id="close-overlay" aria-label="Close Overlay">×</button>
    `;
    controls.querySelectorAll("button").forEach(btn => {
      btn.style.marginLeft = "4px";
      btn.style.cursor = "pointer";
      btn.style.background = "#444";
      btn.style.color = "#fff";
      btn.style.border = "none";
      btn.style.borderRadius = "4px";
      btn.style.width = "28px";
      btn.style.height = "24px";
      btn.style.flexShrink = "0"; // 防止按钮在小尺寸时挤压
    });

    header.appendChild(title);
    header.appendChild(controls);
    overlay.appendChild(header);

    // 内容区域
    content = document.createElement("div");
    content.id = "translation-content";
    content.style.flex = "1";
    content.style.overflowY = "auto"; // 仅垂直滚动
    content.style.padding = "8px";
    content.style.whiteSpace = "pre-wrap"; // 保留换行和空格
    content.style.wordBreak = "break-word"; // 单词内换行
    content.innerText = "🔧 翻译内容将显示在这里…";
    overlay.appendChild(content);

    document.body.appendChild(overlay);

    // 加载设置并应用
    loadSettings();
    updateUIBasedOnSettings();
    bindEvents();
  }

  function updateUIBasedOnSettings() {
    const toggleBtn = document.getElementById("toggle-translation");
    const minimizeBtn = document.getElementById("minimize-overlay");

    // 更新翻译开关按钮
    if (isTranslationEnabled) {
      toggleBtn.innerText = "🔴";
      content.innerText = "▶️ 翻译已启用"; // 初始化内容
    } else {
      toggleBtn.innerText = "⚪";
      content.innerText = "⏸️ 翻译已暂停"; // 初始化内容
    }

    // 更新最小化按钮和内容显示
    if (isMinimized) {
      content.style.display = "none";
      minimizeBtn.innerText = "□"; // 最小化时显示方框（恢复）图标
      overlay.style.height = "auto"; // 最小化时高度自适应
      overlay.style.minHeight = "auto";
    } else {
      content.style.display = "block";
      minimizeBtn.innerText = "−"; // 恢复时显示减号（最小化）图标
      // 恢复到上次保存的高度或默认高度
      if (localStorage.getItem(OVERLAY_STORAGE_KEY)) {
        const settings = JSON.parse(localStorage.getItem(OVERLAY_STORAGE_KEY));
        overlay.style.height = settings.height || "400px";
      } else {
        overlay.style.height = "400px";
      }
    }
  }


  function bindEvents() {
    // 拖动逻辑
    header.addEventListener("mousedown", (e) => {
      isDragging = true;
      offsetX = e.clientX - overlay.getBoundingClientRect().left;
      offsetY = e.clientY - overlay.getBoundingClientRect().top;
      overlay.style.cursor = "grabbing"; // 拖动时改变鼠标样式
    });
    document.addEventListener("mousemove", (e) => {
      if (isDragging) {
        // 防止文本选中
        e.preventDefault();
        overlay.style.left = `${e.clientX - offsetX}px`;
        overlay.style.top = `${e.clientY - offsetY}px`;
        overlay.style.right = "auto"; // 一旦拖动就解除右侧定位
      }
    });
    document.addEventListener("mouseup", () => {
      isDragging = false;
      overlay.style.cursor = "move"; // 恢复鼠标样式
      saveSettings(); // 拖动结束后保存位置
    });

    // 监听resize事件以保存大小
    const resizeObserver = new ResizeObserver(() => {
      // 避免频繁保存，可以在一定延迟后保存
      // 或者只在mouseup事件后保存，但resize没有mouseup
      // 这里暂时每次尺寸变化都保存，你可以根据需要优化
      saveSettings();
    });
    resizeObserver.observe(overlay);


    // 关闭按钮
    document.getElementById("close-overlay").onclick = () => {
      overlay.remove();
      localStorage.removeItem(OVERLAY_STORAGE_KEY); // 关闭时清除设置
    };

    // 最小化按钮
    document.getElementById("minimize-overlay").onclick = () => {
      isMinimized = !isMinimized;
      updateUIBasedOnSettings();
      saveSettings(); // 保存最小化状态
    };

    // 设置按钮
    document.getElementById("open-settings").onclick = () => {
      // 注意：这里仍然是硬编码路径，你需要确保你的panel.html文件在这个位置
      window.open(
        "/scripts/extensions/third-party/sillytavern-translation-overlay/panel.html",
        "_blank"
      );
    };

    // 开关按钮
    const toggleBtn = document.getElementById("toggle-translation");
    toggleBtn.onclick = () => {
      isTranslationEnabled = !isTranslationEnabled;
      updateUIBasedOnSettings();
      saveSettings(); // 保存开关状态

      // 在这里添加/移除实际翻译逻辑的监听器
      if (isTranslationEnabled) {
        console.log("翻译已启用，开始监听消息...");
        // 假设 SillyTavern 有一个全局事件或函数来获取新消息
        // 例如：ST.onNewMessage(handleNewMessage);
        // 或者你需要定时去DOM中抓取最新消息
        // 为了演示，我们模拟一个新消息
        simulateNewMessage("Hello, how are you doing today? This is a longer message to test the translation output.");
      } else {
        console.log("翻译已暂停，停止监听消息...");
        // 例如：ST.offNewMessage(handleNewMessage);
      }
    };

    // --- 模拟 SillyTavern 消息获取和翻译展示 ---
    // !!! 这部分需要根据 SillyTavern 的实际 API 进行调整 !!!
    async function handleNewMessage(messageText) {
      if (!isTranslationEnabled) return; // 如果翻译未启用则不处理

      try {
        const translatedText = await translateText(messageText);
        if (translatedText) {
          // 将原文和译文添加到悬浮窗，保持最新的在最上面
          const currentContent = content.innerHTML;
          content.innerHTML = `
            <div style="margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px dotted #555;">
              <p style="margin: 0; color: #aaa; font-size: 12px;">原文:</p>
              <p style="margin: 0;">${messageText}</p>
              <p style="margin: 0; color: #7cb342; font-size: 12px;">译文:</p>
              <p style="margin: 0; font-style: italic;">${translatedText}</p>
            </div>
          ` + currentContent;
          // 保持滚动条在顶部，显示最新消息
          content.scrollTop = 0;
        }
      } catch (error) {
        console.error("翻译失败:", error);
        content.innerHTML = `
          <div style="color: red; margin-bottom: 10px;">
            <p style="margin: 0;">翻译失败: ${error.message || error}</p>
          </div>
        ` + content.innerHTML;
        content.scrollTop = 0;
      }
    }

    // 模拟一个新消息，你可以把这个调用放在SillyTavern实际获取到新消息的地方
    function simulateNewMessage(text) {
        // 仅在翻译启用时触发模拟
        if (isTranslationEnabled) {
            handleNewMessage(text);
        }
    }

    // 初始时模拟一条消息，以便用户看到效果
    simulateNewMessage("欢迎使用翻译悬浮窗插件！在这里你可以看到最新的聊天消息翻译。");
    // 你可能需要在这里添加事件监听器来实际捕获 SillyTavern 的新消息。
    // 例如：
    // if (typeof window.SillyTavern === 'object' && window.SillyTavern.events) {
    //    window.SillyTavern.events.on('newMessage', handleNewMessage);
    // } else {
    //    console.warn("无法找到 SillyTavern 的事件系统。请检查插件集成方式。");
    // }
  }

  // 启动时自动创建
  createOverlay();
})();
