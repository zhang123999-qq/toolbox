# 键盘导航分析

粘贴 HTML，分析页面的键盘可访问性：统计可聚焦元素（链接、按钮、表单、tabindex、contenteditable），展示模拟 Tab 顺序，并检查正 tabindex、非法 tabindex、重复正 tabindex、div/span 用 `on*` 属性模拟可交互元素、无 href 的 a 标签、缺失跳过链接等问题。

## 用途

- 检查页面是否可脱离鼠标全键盘操作
- 发现打乱 Tab 顺序的正 tabindex
- 发现用 div 模拟按钮等反模式

## 输入

| 字段   | 类型   | 约束       |
| ------ | ------ | ---------- |
| `text` | string | HTML 片段  |

## 说明

- 纯浏览器内 DOMParser 解析，无网络请求。
- 模拟 Tab 顺序规则：正 tabindex 按数值优先，其次 DOM 顺序；tabindex="-1" 的元素可被脚本聚焦但跳过 Tab 顺序。
- 这是静态分析；真实键盘体验仍建议实际按 Tab 走查一遍。
