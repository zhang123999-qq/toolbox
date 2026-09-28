# 权限声明（#776）

A 级工具：纯前端本地生成，无网络、无第三方 API。

## 功能

- **权限字典**：20 个 Chrome 扩展常用权限，每个带中文说明与风险等级
  （低风险 / 中风险 / 高风险），页面内可浏览。
- **清单生成**：输入 JSON（`permissions` / `hostPermissions`），生成可直接并入
  `manifest.json` 的权限片段；未知权限直接报中文错；重复权限自动去重；
  `hostPermissions` 为空时不输出该字段。

## 输入（JSON）

```json
{
  "permissions": ["storage", "activeTab", "scripting"],
  "hostPermissions": ["https://api.example.com/*"]
}
```

## 说明

- 高风险权限（如 `cookies` / `history` / `debugger` / `proxy`）会触发 Chrome
  应用商店严格审核，请按最小权限原则申请。
- 所有处理在浏览器本地完成，不发送任何网络请求。
