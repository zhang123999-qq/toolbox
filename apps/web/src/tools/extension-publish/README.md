# 扩展发布（#784）

A 级工具：纯前端本地评估，无网络、无第三方 API。

## 功能

按目标商店（Chrome Web Store / Edge Add-ons / Firefox Add-ons）的要求，
对扩展发布材料逐项检查：

| 检查项 | 说明 |
|---|---|
| manifest.json 存在 | 打包 zip 根目录必须包含 |
| manifest 合法（MV3） | 合法 JSON 且 `manifest_version` 为 3 |
| 名称/版本/描述完整 | `name` / `version` / `description` |
| 图标齐全 | 声明 128px 图标且文件存在 |
| 安装包大小合规 | Chrome/Edge 上限 128MB，Firefox 上限 200MB |
| 商店截图已准备 | 建议 1280×800 至少 1 张 |
| 隐私政策（如需） | 声明敏感权限或处理用户数据时必须提供 |
| 源码提交（Firefox） | 代码经混淆/压缩时需附可读源码 |

## 使用说明

1. 在输入框粘贴 `manifest.json`；
2. 选择目标商店，填写文件列表（每行一个文件名）；
3. 在附加信息 JSON 中填写 `zipSizeKb`（打包后 KB 数）、`hasScreenshots`、
   `hasPrivacyPolicy`；
4. 点击「开始检查」查看通过/未通过清单。

## 商店差异说明

- **Chrome / Edge**：安装包上限 128MB；Edge 要求与 Chrome 基本一致；
- **Firefox**：安装包上限 200MB；混淆或压缩过的代码必须提交可读源码；
- 各商店对截图尺寸、描述文案、隐私政策的具体要求以官方文档为准，
  本工具仅做发布前自查，不能替代商店审核。
