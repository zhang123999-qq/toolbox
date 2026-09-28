# 地标角色分析

粘贴 HTML，分析页面的 ARIA 地标角色：识别 banner（页眉）、navigation（导航）、main（主内容）、complementary（侧边栏）、contentinfo（页脚）、search、region 等地标，检查缺失 main、多 banner、无名地标等问题，并附标准地标骨架代码。

## 用途

- 检查页面地标结构是否完整、唯一
- 为多个导航/区域补无障碍名称
- 复制标准地标骨架搭建新页面

## 输入

| 字段   | 类型   | 约束      |
| ------ | ------ | --------- |
| `text` | string | HTML 片段 |

## 说明

- 纯浏览器内 DOMParser 解析，无网络请求。
- 隐式规则：`article` / `aside` / `main` / `nav` / `section` 内部的 `header` / `footer` / `aside` 不计为顶层地标（符合 ARIA 规范）。
- 无名 `region` 不会被辅助技术识别为地标，必须加 `aria-label`。
