# SillyTavern 翻译悬浮窗插件

专为SillyTavern设计的实时翻译悬浮窗插件，支持通过URL直接导入。

## 功能特性

- 🚀 **一键导入** - 通过GitHub URL直接导入SillyTavern
- 🔧 **可视化设置** - 直接在界面配置API信息
- 🤖 **自动获取模型** - 一键拉取可用模型列表
- 🌍 **多语言支持** - 支持中英日韩等语言翻译
- 💾 **自动保存** - 设置自动保存到浏览器本地存储
- 🔍 **连接测试** - 测试API连接是否正常
- 📖 **实时翻译** - 自动检测并翻译`<char>`标签内容

## 安装方法

### 方法一：URL导入（推荐）
1. 打开SillyTavern
2. 进入扩展管理界面
3. 选择"从URL安装"
4. 输入以下URL：https://raw.githubusercontent.com/yourusername/sillytavern-translation-overlay/main/module.json
5. 点击安装并重启SillyTavern

### 方法二：手动安装
1. 下载本仓库文件
2. 将文件放入SillyTavern的扩展目录：
`public/scripts/extensions/third-party/translation-overlay/`
3. 重启SillyTavern

## 使用方法

1. 安装后悬浮窗会自动出现在屏幕右侧
2. 点击右上角的设置按钮(⚙️)
3. 填写API地址和密钥
4. 点击"获取模型"选择可用模型
5. 选择目标语言
6. 点击"保存设置"
7. 开始享受实时翻译功能

## API支持

- ✅ OpenAI格式API (OpenAI, DeepSeek等)
- ✅ 任何兼容OpenAI API格式的服务
- ✅ 自动尝试多个模型端点

## 操作说明

- **拖动标题栏** - 移动窗口位置
- **拖动边缘** - 调整窗口大小  
- **🔴/⚪按钮** - 启用/禁用翻译功能
- **−按钮** - 最小化内容区域
- **×按钮** - 关闭悬浮窗
- **⚙️按钮** - 打开设置面板

## 技术说明

- 使用MutationObserver自动检测新消息
- 支持`<char>`标签内容提取和翻译
- 配置自动保存到localStorage
- 完全兼容SillyTavern扩展系统

## 问题排查

如果插件无法正常工作：

1. 检查浏览器控制台是否有错误信息
2. 确认API地址和密钥填写正确
3. 尝试点击"测试连接"验证API配置
4. 确保SillyTavern版本在1.10.0以上

## 更新日志

### v1.0.0
- 初始版本发布
- 支持URL导入功能
- 基础翻译功能完成

## 许可证

MIT License - 可自由使用和修改
