# 头像生成（avatar）

## 工具用途 / Purpose

- 中文：输入用户名生成 SVG 头像，支持首字母、几何图案、渐变三种样式，可自定义尺寸与背景色，适用于默认头像、用户占位图。
- English: Generate an SVG avatar from a username with initials, geometric, or gradient styles; customize size and background color for default avatars and user placeholders.

## 输入 / Inputs

- `input`：用户名 / 种子文本。留空则随机生成一个头像（每次挂载随机）。
  - 中文取首字，英文取首字母大写。

## 输出 / Outputs

- 可视化：右侧面板内联渲染 SVG 头像。
- 文本：复制 / 下载为 `.svg` 文件，内容即 SVG 源码。

## 选项 / Options

- `尺寸`：头像边长（px），32–512 整数，默认 128。
- `样式`：
  - `initials`：圆形渐变底 + 居中首字母（经典默认头像）。
  - `geometric`：基于文本哈希的圆形 / 三角形几何组合。
  - `gradient`：纯渐变方块 + 居中首字母。
- `背景色`：CSS 颜色值（如 `#3b82f6`），留空则按文本哈希随机生成渐变色。

## 限制 / Limits

- 尺寸非法（非整数、越界 32–512）或样式未知时进入错误态（中文提示）。
- 相同用户名 + 相同选项 → 相同头像（确定性）。

## 数据流向 / Data flow

- 全本地生成，不上传网络。颜色与图案由 FNV-1a 文本哈希 + mulberry32 种子随机数驱动；空输入时由挂载时的 `crypto.getRandomValues` 种子决定，保证显示 / 复制 / 下载结果一致。

## 示例 / Example

输入 `张三`，样式 `initials`，尺寸 `128` → 圆形渐变头像，居中显示「张」。

## 元信息 / Meta

- 编号：#384 ｜ 分类：random / design ｜ 优先级：P1 ｜ 可行性：A ｜ 模板：T3 ｜ 依赖：无
