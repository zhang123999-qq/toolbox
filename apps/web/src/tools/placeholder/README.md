# 占位图生成（placeholder）

## 工具用途 / Purpose

- 中文：输入尺寸生成灰色 SVG 占位图，用于前端开发时图片未就位的占位。
- English: Generate a gray SVG placeholder image from a size, for front-end development when images are not ready.

## 输入 / Inputs

- `input`：尺寸，格式 `WxH` 或 `W×H`（如 `300x200`）。留空默认 `400x300`。

## 输出 / Outputs

- 可视化：右侧面板内联渲染 SVG 占位图。
- 文本：复制 / 下载为 `.svg` 文件。

## 选项 / Options

- `背景色`：CSS 颜色，默认 `#cccccc`。
- `文字颜色`：CSS 颜色，默认 `#666666`。
- `自定义文字`：留空时居中显示尺寸（如 `300 × 200`），填写后显示自定义文字。

## 限制 / Limits

- 尺寸格式非法（非 `WxH` / `W×H`）或尺寸超出 1–4000 时进入错误态（中文提示）。

## 数据流向 / Data flow

- 全本地生成，不上传网络。纯 SVG 字符串拼装，无随机、无状态。

## 示例 / Example

输入 `300x200`，背景色 `#cccccc`，自定义文字留空 → 灰色矩形，居中显示「300 × 200」。

## 元信息 / Meta

- 编号：#387 ｜ 分类：random / design ｜ 优先级：P1 ｜ 可行性：A ｜ 模板：T3 ｜ 依赖：无
