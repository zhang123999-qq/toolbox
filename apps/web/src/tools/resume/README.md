# 简历生成 · Resume Builder

填写姓名、职位、联系方式、经历等信息，右侧实时预览排版，点击「导出 PNG」生成简历图片。
纯前端处理，不上传数据。

Fill in your name, title, contact and experience; the layout previews live on the right.
Click "Export PNG" to download the resume as an image. All processing is local; nothing is uploaded.

## 用途 / Purpose

- 快速制作一页式简历并导出为 PNG 图片
- 预览排版效果后再导出，避免反复调整

## 输入 / Inputs

| 字段                     | 类型   | 约束                              |
| ------------------------ | ------ | --------------------------------- |
| `text`（姓名）           | string | 必填（填了其他字段时），≤ 40 字符 |
| `title`（职位）          | string | 可选，≤ 60 字符                   |
| `phone`（电话）          | string | 可选，≤ 30 字符                   |
| `email`（邮箱）          | string | 可选，≤ 80 字符                   |
| `summary`（个人简介）    | string | 可选，≤ 500 字符                  |
| `experience`（工作经历） | string | 可选，≤ 3000 字符，多行           |
| `education`（教育背景）  | string | 可选，≤ 1000 字符                 |
| `skills`（技能）         | string | 可选，≤ 500 字符                  |

## 输出 / Outputs

- 右侧预览：固定浅色纸面排版（与导出 PNG 一致）
- 「导出 PNG」按钮：2x 倍率导出预览区为 PNG，文件名 `resume-<姓名>.png`
- 复制 / 下载：简历的纯文本版本（`.txt`）

## 选项 / Options

无。

## 限制 / Limits

- 各字段长度上限见上表，超长会报错（中英双语）
- 预览与导出均不加载外部图片与外部字体（系统字体栈），避免跨域导致导出失败
- 导出依赖浏览器 Canvas 能力；若浏览器拦截下载或 Canvas 被污染，会显示双语错误提示

## 数据流向 / Data flow

纯本地计算与渲染，不调用外部接口，不上传任何数据。

## 示例 / Example

输入：姓名 `陈静`、职位 `高级前端工程师`、电话 `138-0000-1234`

输出预览：

```text
陈静
高级前端工程师
联系方式：138-0000-1234 / chenjing@example.com

个人简介：
8 年前端开发经验，专注 React 生态与工程化……
```

## 边界行为 / Edge cases

- 全部留空 → 显示空态提示，不报错
- 填了其他字段但姓名为空 → 报错「请填写姓名」
- 任一字段超长 → 报错「{字段}超过 {上限} 字符上限」
- 输入含 HTML 特殊字符（如 `<img>`）→ 预览中自动转义，不破坏布局、不执行脚本

## 元信息 / Meta

| 项    | 值                              |
| ----- | ------------------------------- |
| slug  | `resume`（全局编号 #405）       |
| 域/组 | random / design                 |
| 模板  | T3                              |
| 依赖  | html-to-image（导出时动态加载） |
