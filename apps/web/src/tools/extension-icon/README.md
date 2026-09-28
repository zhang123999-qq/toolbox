# 扩展图标（#774）

A 级工具：纯前端本地绘制，无网络、无第三方 API。

## 功能

- **绘制**：输入 JSON 参数，在离屏 canvas 上绘制扩展图标：
  底形 `rounded-square`（圆角矩形）/ `circle`（圆形）+ 1～2 个字母，
  背景色 / 前景色均为 `#rrggbb`。
- **导出**：一键生成 16 / 48 / 128 三档 PNG，页面内预览并可分别下载
  （`icon16.png` / `icon48.png` / `icon128.png`），可直接放入扩展目录并在
  `manifest.json` 的 `icons` 字段引用。

## 输入参数（JSON）

```json
{
  "size": 48,
  "bg": "#2563eb",
  "fg": "#ffffff",
  "letter": "T",
  "shape": "rounded-square"
}
```

`size` 仅为预览基准，实际固定导出 16/48/128 三档。

## 说明

- 绘制逻辑与 DOM 解耦：`drawIconOnContext` 只依赖最小 2D 上下文接口，
  单测用 mock 上下文断言调用序列，不依赖真实 canvas。
- 所有处理在浏览器本地完成，不发送任何网络请求。
