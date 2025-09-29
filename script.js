// translation-overlay/script.js

let apiUrl = localStorage.getItem("overlayApiUrl") || "";
let apiKey = localStorage.getItem("overlayApiKey") || "";
let modelName = localStorage.getItem("overlayModel") || "";
let targetLang = localStorage.getItem("overlayLang") || "zh";

const overlayBox = document.createElement("div");
overlayBox.className = "translation-overlay";
overlayBox.innerHTML = `
  <div class="overlay-header">
    <span>翻译窗口</span>
    <button id="overlay-close">✖</button>
  </div>
  <div class="overlay-content"></div>
  <div class="overlay-error" style="color:red; font-size:12px; margin-top:4px;"></div>
`;
document.body.appendChild(overlayBox);

document.getElementById("overlay-close").onclick = () => {
  overlayBox.style.display = "none";
};

const errorBox = overlayBox.querySelector(".overlay-error");
function showError(msg) {
  errorBox.textContent = msg || "";
}

// 保存配置
function saveConfig() {
  localStorage.setItem("overlayApiUrl", apiUrl);
  localStorage.setItem("overlayApiKey", apiKey);
  localStorage.setItem("overlayModel", modelName);
  localStorage.setItem("overlayLang", targetLang);
}

// 调用翻译 API
async function translateText(text) {
  if (!apiUrl || !apiKey || !modelName) {
    showError("请先在设置中填写 API 地址、密钥和模型");
    return text;
  }
  try {
    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: `Translate into ${targetLang}.` },
          { role: "user", content: text },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      showError(`API 错误: ${response.status} ${err}`);
      return text;
    }

    const data = await response.json();
    // 兼容 OpenAI / DeepSeek 返回格式
    const translated =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.text ||
      text;
    showError("");
    return translated;
  } catch (e) {
    showError("请求失败: " + e.message);
    return text;
  }
}

// 监控消息区域
function observeChat() {
  const chatRoot = document.querySelector("#chat") || document.body;
  const observer = new MutationObserver(async (mutations) => {
    for (let mutation of mutations) {
      for (let node of mutation.addedNodes) {
        if (node.nodeType === 1) {
          const msg = node.innerText?.trim();
          if (msg && msg.length > 2) {
            const translated = await translateText(msg);
            const div = document.createElement("div");
            div.style.cssText =
              "margin-top:4px; font-size:13px; color:#66ccff;";
            div.textContent = `[译] ${translated}`;
            node.appendChild(div);
          }
        }
      }
    }
  });
  observer.observe(chatRoot, { childList: true, subtree: true });
}

observeChat();
