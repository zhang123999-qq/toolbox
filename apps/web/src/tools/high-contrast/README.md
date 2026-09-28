# 高对比度

生成高对比度主题 CSS：自定义背景 / 前景 / 链接颜色，输出 CSS 变量与 `.hc-theme` 规则；同时生成 `@media (forced-colors: active)` 下的系统色适配（Canvas、CanvasText、LinkText、Highlight），并用手写 WCAG 公式校验正文与链接的对比度（AA ≥ 4.5:1、AAA ≥ 7:1、UI 组件 ≥ 3:1）。

## 用途

- 为网站提供高对比度主题样式
- 校验配色是否满足 WCAG 对比度要求
- 适配 Windows 高对比度主题（forced-colors）

## 输入

| 字段   | 类型   | 约束                       |
| ------ | ------ | -------------------------- |
| `text` | string | 未使用（参数在页面表单中） |

在页面内设置：背景颜色、前景颜色、链接颜色、主题模式（dark / light / forced）。

## 说明

- 纯前端生成与校验，无网络请求，零依赖（对比度公式手写实现）。
- forced 模式会额外生成 `.hc-force-only` 类用于需要恢复系统色调整的元素。
- 预览区实时展示主题效果与对比度报告。
