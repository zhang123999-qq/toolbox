# 油猴调试（#785）

A 级工具：纯前端本地扫描，无网络、无第三方 API。

## 功能

粘贴 Tampermonkey / Violentmonkey 用户脚本源码，一键扫描常见问题：

- **错误**：缺少 `==UserScript==` 元数据块、元数据块未闭合、缺少 `@name` /
  `@version`、非法 `@match` / `@include` 写法；
- **警告**：未声明 `@match` / `@include`（脚本将在所有页面运行）、`@version`
  非 x.y.z 格式、使用了 `GM_` 函数但未声明对应 `@grant`、声明 `@grant none`
  却使用 `GM_` 函数、`document.write`、`eval`。

每个问题标注行号（1 起始）。

## 使用说明

1. 在输入框粘贴用户脚本源码；
2. 点击「开始扫描」查看问题清单。

## 说明

- 本工具为静态文本扫描，不能执行脚本，也不能替代在脚本管理器中实际安装测试；
- `@match` 合法性按 Chrome Match Pattern 规则做近似校验，`<all_urls>` 视为合法。
