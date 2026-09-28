# CSS 动画生成 css-gen（#391）

## 用途 | Purpose

- 选择预设动画，一键生成 `@keyframes` + `animation` 完整 CSS。
- Pick a preset animation and generate full `@keyframes` + `animation` CSS.

## 输入 | Input

- 文本框：动画名称（可选）。留空使用「预设动画」选项；填入预设名可覆盖选项。
- Textarea: animation name (optional). Leave empty to use the preset option; entering a preset name overrides it.

## 选项 | Options

| 选项              | 说明                                                                                               | Option   | Description                        |
| ----------------- | -------------------------------------------------------------------------------------------------- | -------- | ---------------------------------- |
| 预设动画 preset   | bounce / fadeIn / fadeOut / slideInLeft / slideInRight / rotate / pulse / flip / shake / heartbeat | Preset   | ten built-in easings               |
| 时长 duration     | 默认 1s，如 500ms / 1.5s                                                                           | Duration | default 1s, e.g. 500ms / 1.5s      |
| 缓动函数 timing   | ease / ease-in / ease-out / linear                                                                 | Timing   | ease / ease-in / ease-out / linear |
| 无限循环 infinite | 开启则追加 `infinite` 关键字                                                                       | Infinite | append `infinite` when on          |

## 输出 | Output

- 可直接复制的完整 CSS：`@keyframes` 定义 + `.animation { animation: ...; }`。
- Ready-to-copy CSS: `@keyframes` definition + `.animation { animation: ...; }`.

## 限制 | Limits

- 时长须为数字 + `s`/`ms`；未知预设名会列出可用列表；非法输入显示中文错误。
- Duration must be number + `s`/`ms`; unknown preset names list available presets; invalid input shows a Chinese error.

## 数据流向 | Data flow

- 全部在浏览器本地计算，无网络请求、无第三方依赖。
- All computation happens locally in the browser; no network requests, no third-party deps.

## 示例 | Example

预设 bounce，1s ease →

```css
@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}

.animation {
  animation: bounce 1s ease;
}
```

## 元信息 | Meta

- 编号 #391 · category `random` · group `design` · 可行性 A · 纯前端 · deps: 无
