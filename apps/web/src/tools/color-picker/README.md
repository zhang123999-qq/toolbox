# 屏幕取色器 color-picker（#466）

## 用途 | Purpose

- 屏幕取色：点击「屏幕取色」后在屏幕任意位置点选，得到该像素颜色。
- Pick any color from your screen; results are shown as HEX / RGB / HSL and can be copied with one click.
- 全程本地运行，不上传任何数据。

## 取色路径 | Pick paths

| 路径        | 说明                                               | Path            | Description                              |
| ----------- | -------------------------------------------------- | --------------- | ---------------------------------------- |
| EyeDropper  | 系统级取色，`new EyeDropper().open()` 取 `sRGBHex` | EyeDropper      | System-level picker via `EyeDropper` API |
| Canvas 兜底 | 上传图片 → 绘制到 Canvas → 点击图片取像素          | Canvas fallback | Upload image → click pixel via Canvas    |
| 手动输入    | 直接输入 `#rgb` / `#rrggbb`                        | Manual input    | Type a hex value directly                |

## 输出 | Output

- 大色块预览 + HEX / RGB / HSL 三种表示，点击任意值复制到剪贴板（`navigator.clipboard.writeText`，失败时提示手动复制）。

## 浏览器支持 | Browser support

- EyeDropper 为 Chromium 系（Chrome / Edge / Opera）专有 API；Firefox / Safari 下主按钮自动隐藏，页面提示使用图片取色兜底路径。
- EyeDropper requires Chromium; on Firefox/Safari the main button is hidden and the page suggests the image fallback.

## 边界 | Limits

- 用户在取色框中按 Esc 取消（`AbortError`）→ 仅轻提示「已取消取色」，不视为错误。
- EyeDropper 其他错误（如权限被拒）→ 通用错误提示，可改用图片取色。
- 手动输入仅接受 `#rgb` / `#rrggbb`（`#` 可省略），非法输入报错。
- Canvas 兜底按图片显示尺寸与自然尺寸的比例换算点击坐标，点到图片外时钳制到边缘像素。

## 数据流向 | Data flow

屏幕像素 / 图片文件 → 内存 Canvas → 色值文本 → 剪贴板；不经过网络。
