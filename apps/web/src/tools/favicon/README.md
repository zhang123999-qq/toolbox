# Favicon 生成（favicon）

## 工具用途 / Purpose

- 中文：生成网站标签页图标 favicon，支持字母、渐变、几何三种样式，可导出 SVG 与 PNG。
- English: Generate a website favicon with letter, gradient, or geometric styles; export as SVG and PNG.

## 输入 / Inputs

- `input`：图标文本 / 首字母。留空随机生成一个字母。
  - 中文取首字，英文取首字母大写。

## 输出 / Outputs

- 可视化：右侧面板内联渲染 SVG favicon。
- 「导出 PNG」按钮：用 canvas 绘制 SVG 内容后下载为 `favicon.png`。
- 文本：复制 / 下载为 `.svg` 文件。

## 选项 / Options

- `尺寸`：边长（px），16–256 整数，默认 64。
- `样式`：
  - `letter`：纯色背景 + 首字母。
  - `gradient`：渐变背景 + 首字母。
  - `geometric`：几何图案（三角形 + 圆）。
- `背景色`：CSS 颜色，留空随机。
- `前景色`：CSS 颜色，默认 `#ffffff`。

## 限制 / Limits

- 尺寸非法（非整数、越界 16–256）或样式未知时进入错误态（中文提示）。
- 相同文本 + 相同选项 → 相同图标。

## 数据流向 / Data flow

- 全本地生成，不上传网络。配色由文本哈希 + mulberry32 驱动；PNG 导出在浏览器 canvas 完成，不经过服务器。

## 示例 / Example

输入 `F`，样式 `letter`，尺寸 `64`，背景色 `#2563eb` → 蓝色圆角方块 + 白色「F」。

## 元信息 / Meta

- 编号：#386 ｜ 分类：random / design ｜ 优先级：P0 ｜ 可行性：A ｜ 模板：T3 ｜ 依赖：无
