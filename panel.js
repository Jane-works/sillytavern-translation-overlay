document.addEventListener("DOMContentLoaded", () => {
    const settingsForm = document.getElementById("settings-form");
    const translationApiUrlInput = document.getElementById("translationApiUrl");
    const translationApiKeyInput = document.getElementById("translationApiKey");
    const statusMessage = document.getElementById("status-message");

    // 必须与主插件 JS 中的 KEY 保持一致
    const OVERLAY_STORAGE_KEY = "translationOverlaySettings";

    // 显示状态消息的辅助函数
    function showStatus(message, type = "info") {
        statusMessage.innerText = message;
        statusMessage.className = ""; // 清除旧的样式
        statusMessage.classList.add("status-" + type); // 添加新样式
        setTimeout(() => {
            statusMessage.innerText = "";
            statusMessage.className = "";
        }, 5000); // 5 秒后自动消失
    }

    // 加载现有设置到表单
    function loadPanelSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem(OVERLAY_STORAGE_KEY));
            if (settings) {
                translationApiUrlInput.value = settings.customTranslationApiUrl || "";
                translationApiKeyInput.value = settings.customTranslationApiKey || "";
                showStatus("设置已加载。", "info");
            } else {
                showStatus("首次加载，请配置翻译 API。", "info");
            }
        } catch (e) {
            console.error("翻译插件设置面板：加载设置失败:", e);
            showStatus("加载设置失败: " + e.message, "error");
        }
    }

    // 保存设置
    settingsForm.addEventListener("submit", (event) => {
        event.preventDefault(); // 阻止表单默认提交行为

        const customTranslationApiUrl = translationApiUrlInput.value.trim();
        const customTranslationApiKey = translationApiKeyInput.value.trim();

        if (!customTranslationApiUrl) {
            showStatus("翻译 API URL 不能为空！", "error");
            return;
        }

        try {
            // 获取现有所有设置，并更新或添加翻译相关的设置
            const existingSettings = JSON.parse(localStorage.getItem(OVERLAY_STORAGE_KEY)) || {};
            existingSettings.customTranslationApiUrl = customTranslationApiUrl;
            existingSettings.customTranslationApiKey = customTranslationApiKey;

            localStorage.setItem(OVERLAY_STORAGE_KEY, JSON.stringify(existingSettings));
            showStatus("设置已成功保存！请关闭此窗口。", "success");

            // 通知主插件重新加载设置。
            // 由于 panel 和主插件是两个独立的
