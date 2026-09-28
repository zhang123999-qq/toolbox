# 扩展调试（#783）

A 级工具：纯前端本地诊断，无网络、无第三方 API。

## 功能

粘贴 `manifest.json` 并填写扩展文件列表，一键诊断常见问题：

- **错误**：JSON 语法错误、`manifest_version` 非 3、残留 MV2 字段
  （`browser_action` / `page_action` / 字符串形式 CSP / `background.scripts` /
  `background.persistent`）、缺少 `name` / `version`；
- **警告**：`service_worker` 文件不在列表中、未声明 `service_worker`、
  图标文件缺失、`host_permissions` 过于宽泛（`<all_urls>` 等）；
- **提示**：未声明 `background` / `icons`、权限数量过多（最小权限原则）。

每个问题都附带中文修复建议。

## 使用说明

1. 在输入框粘贴 `manifest.json` 内容；
2. 在文件列表中每行填写一个扩展内文件名；
3. 点击「开始诊断」查看问题清单与修复建议。

## 说明

- 本工具为静态检查，不能替代在 `chrome://extensions` 中加载测试；
- 文件存在性仅依据填写的列表核对，不读取真实文件系统。
