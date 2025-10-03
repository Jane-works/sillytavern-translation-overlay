(function () {
  let overlay, header, content, isDragging = false, offsetX, offsetY;

  function createOverlay() {
    // 如果已存在就不重复创建
    if (document.getElementById("translation-overlay")) return;

    overlay = document.createElement("div");
    overlay.id = "translation-overlay";
    overlay.style.position = "fixed";
    overlay.style.top = "100px";
    overlay.style.right = "20px";
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

    // 标题栏
    header = document.createElement("div");
    header.style.cursor = "move";
    header.style.background = "#222";
    header.style.padding = "5px 8px";
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.style.borderBottom = "1px solid #444";

    const title = document.createElement("span");
    title.innerText = "翻译悬浮窗";
    title.style.fontWeight = "bold";
    title.style.fontSize = "14px";

    const controls = document.createElement("div");
    controls.innerHTML = `
      <button id="toggle-translation">🔴</button>
      <button id="open-settings">⚙️</button>
      <button id="minimize-overlay">−</button>
      <button id="close-overlay">×</button>
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
    });

    header.appendChild(title);
    header.appendChild(controls);
    overlay.appendChild(header);

    // 内容区域
    content = document.createElement("div");
    content.id = "translation-content";
    content.style.flex = "1";
    content.style.overflow = "auto";
    content.style.padding = "8px";
    content.innerText = "🔧 翻译内容将显示在这里…";
    overlay.appendChild(content);

    document.body.appendChild(overlay);

    bindEvents();
  }

  function bindEvents() {
    // 拖动逻辑
    header.addEventListener("mousedown", (e) => {
      isDragging = true;
      offsetX = e.clientX - overlay.getBoundingClientRect().left;
      offsetY = e.clientY - overlay.getBoundingClientRect().top;
    });
    document.addEventListener("mousemove", (e) => {
      if (isDragging) {
        overlay.style.left = `${e.clientX - offsetX}px`;
        overlay.style.top = `${e.clientY - offsetY}px`;
        overlay.style.right = "auto";
      }
    });
    document.addEventListener("mouseup", () => {
      isDragging = false;
    });

    // 关闭按钮
    document.getElementById("close-overlay").onclick = () => {
      overlay.remove();
    };

    // 最小化按钮
    document.getElementById("minimize-overlay").onclick = () => {
      content.style.display = content.style.display === "none" ? "block" : "none";
    };

    // 设置按钮
    document.getElementById("open-settings").onclick = () => {
      window.open(
        "/scripts/extensions/third-party/sillytavern-translation-overlay/panel.html",
        "_blank"
      );
    };

    // 开关按钮
    const toggleBtn = document.getElementById("toggle-translation");
    toggleBtn.onclick = () => {
      if (toggleBtn.innerText === "🔴") {
        toggleBtn.innerText = "⚪";
        content.innerText = "⏸️ 翻译已暂停";
      } else {
        toggleBtn.innerText = "🔴";
        content.innerText = "▶️ 翻译已启用";
      }
    };
  }

  // 启动时自动创建
  createOverlay();
})();
