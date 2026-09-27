# 海报生成 · Poster Generator

填写标题、副标题、正文与落款，选择主题配色，右侧实时预览海报，
点击「导出 PNG」下载海报图片。纯前端处理，不上传数据。

Enter a title, subtitle, body and footer, pick a color theme, and preview the poster
live on the right. Click "Export PNG" to download it as an image.
All processing is local; nothing is uploaded.

## 用途 / Purpose

- 活动宣传、促销海报快速出图
- 社交媒体配图

## 输入 / Inputs

| 字段                 | 类型   | 约束                    |
| -------------------- | ------ | ----------------------- |
| `text`（正文）       | string | 可选，多行，≤ 2000 字符 |
| `title`（标题）      | string | 可选，≤ 80 字符         |
| `subtitle`（副标题） | string | 可选，≤ 120 字符        |
| `footer`（落款）     | string | 可选，≤ 100 字符        |

## 输出 / Outputs

- 右侧预览：3:4 竖版海报（主题渐变背景、标题、分隔线、正文、落款）
- 「导出 PNG」按钮：2x 倍率导出，文件名 `poster-<标题>.png`
- 复制 / 下载：海报的纯文本版本（`.txt`）

## 选项 / Options

| 选项    | 类型   | 说明                                |
| ------- | ------ | ----------------------------------- |
| `theme` | select | 主题配色：橙红 / 深蓝 / 墨绿 / 暗夜 |

## 限制 / Limits

- 主题只能是 4 个预设之一（其他值 → 「未知的海报主题」）
- 不加载外部图片与外部字体，避免跨域导致导出失败
- 导出依赖浏览器 Canvas；失败时显示双语错误提示

## 数据流向 / Data flow

纯本地计算与渲染，不调用外部接口，不上传任何数据。

## 示例 / Example

输入：标题 `金秋大促`、正文 `秋日特惠，全场八折`

输出：橙红主题渐变海报预览，可导出 PNG。

## 边界行为 / Edge cases

- 全部留空 → 空态提示，不报错
- 仅填正文 → 无标题分隔线，直接展示正文
- HTML 特殊字符 → 预览中自动转义

## 元信息 / Meta

| 项    | 值                              |
| ----- | ------------------------------- |
| slug  | `poster`（全局编号 #409）       |
| 域/组 | random / design                 |
| 模板  | T3                              |
| 依赖  | html-to-image（导出时动态加载） |
