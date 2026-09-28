# Logo 生成（logo）

## 工具用途 / Purpose

- 中文：输入品牌名，生成「左侧图标 + 右侧品牌文字」的 SVG Logo，适用于产品草稿、品牌示意。
- English: Enter a brand name to generate an SVG logo with an icon mark on the left and brand text on the right, for product drafts and brand mockups.

## 输入 / Inputs

- `input`：品牌名。留空使用示例品牌 `Brand`。

## 输出 / Outputs

- 可视化：右侧面板内联渲染 SVG Logo。
- 文本：复制 / 下载为 `.svg` 文件。

## 选项 / Options

- `风格`：
  - `minimal`：线条图标 + 简洁文字。
  - `gradient`：渐变填充图标 + 白色首字母。
  - `geometric`：抽象三角形 / 圆形几何组合。
  - `badge`：徽章圆形 + 五角星。
- `主色` / `辅色`：CSS 颜色值，留空按品牌哈希随机配色。
- `图标形状`：`circle` / `square` / `none`。

## 限制 / Limits

- 风格或图标形状非法时进入错误态（中文提示）。
- 相同品牌名 + 相同选项 → 相同 Logo（确定性）。

## 数据流向 / Data flow

- 全本地生成，不上传网络。配色由 FNV-1a 品牌名哈希 + mulberry32 驱动；空品牌名时用挂载随机种子，保证显示 / 复制 / 下载一致。

## 示例 / Example

输入 `Acme`，风格 `gradient`，主色 `#2563eb` → 渐变圆形图标 + 右侧「Acme」文字。

## 元信息 / Meta

- 编号：#385 ｜ 分类：random / design ｜ 优先级：P2 ｜ 可行性：A ｜ 模板：T3 ｜ 依赖：无
