# 时间线生成

左侧按「日期 | 标题 | 描述（可选）」每行输入一个事件，右侧渲染为样式化 HTML 时间线；可复制 / 下载 HTML。纯 JS 实现，零依赖。

## 用途

- 画项目里程碑、产品发布史、个人简历时间线
- 在文档 / 网页里嵌入一份现成的时间线 HTML
- 自动按日期排序、自动标注相邻事件间隔天数

## 输入

| 字段   | 类型   | 约束                 |
| ------ | ------ | -------------------- |
| `text` | string | 多行事件，每行「日期 | 标题 | 描述（可选）」（必填） |

行格式：`2026-01-05 | 立项 | 确定做在线工具库`。日期必须为真实的 `YYYY-MM-DD`；空行与 `#` 开头注释行会被忽略；描述中可包含 `|`。

## 输出

- 右侧预览区：样式化时间线（纵向 / 横向，可选显示事件间隔天数）
- 复制 / 下载：完整 HTML（含内联样式，可直接嵌入网页）

## 选项

| 选项        | 类型    | 说明                                                |
| ----------- | ------- | --------------------------------------------------- |
| `direction` | select  | `vertical`（纵向） / `horizontal`（横向），默认纵向 |
| `showGap`   | boolean | 是否标注相邻事件间隔天数，默认开                    |

## 边界

- 空输入 → 右侧显示引导文案，不报错
- 非空但无有效事件（如全是注释）→ 双语报错
- 日期非法（格式错误 / 月份越界 / 不存在的日历日期如 2026-02-30）→ 双语报错
- 行格式错误（缺少 `|`）或标题为空 → 双语报错并带行号
- 事件超过 500 条 → 只取前 500 条，并在预览区顶部说明
- 输入超过 200,000 字符 → 拒绝并报错
- 标题 / 描述中的 `<>&"'` 全部转义后再拼 HTML（防 XSS）

## 示例

### 示例 1：产品发布史（「示例」按钮填入）

```text
2026-01-05 | 立项 | 确定做在线工具库
2026-03-12 | 内测 | 邀请 50 位用户试用
2026-06-01 | 公测 | 开放注册
2026-09-27 | v0.0.4 发布 | 310 个工具上线
```

### 示例 2：个人简历时间线

```text
2018-09-01 | 入学 | XX 大学计算机系
2022-06-30 | 毕业 | 获学士学位
2022-07-15 | 入职 | 前端工程师
2024-03-01 | 晋升 | 高级前端工程师
```

### 示例 3：注释与空行

```text
# 项目里程碑（# 开头为注释，会被忽略）
2025-01-01 | 需求冻结

2025-02-15 | 开发完成 | 前后端联调通过
2025-03-01 | 上线
```

## 数据流向

纯本地：解析与 HTML 生成全部在**浏览器内**完成，不上传到任何服务器。

## 与 #305 timeline 的区别

#305 `timeline` 是“日期事件排序文本时间线”：输入日期事件后输出**纯文本**排序结果。#404 `timeline-gen` 是“时间线生成”：输出**样式化 HTML 时间线**（纵/横向、间隔标注、内联样式），可直接下载嵌入网页。

## 元信息

| 项       | 值                                           |
| -------- | -------------------------------------------- |
| 全局编号 | #404                                         |
| 域       | `random`（随机 / 生成 / 设计）               |
| 大组     | `design`                                     |
| 优先级   | P2                                           |
| 可行性   | A（纯前端，零依赖）                          |
| 模板     | T3（左输入右预览；预览为富 HTML 而非纯文本） |
| 依赖     | 无                                           |

---

# Timeline Generator (English)

Enter one event per line as `date | title | description (optional)` on the left; the right panel renders a styled HTML timeline. Copy or download the HTML. Pure JS, zero dependencies.

## Purpose

- Draw project milestones, product launch history, résumé timelines
- Embed a ready-made timeline HTML into docs / web pages
- Auto-sorts by date and optionally labels the gap in days between adjacent events

## Input

| Field  | Type   | Constraint                |
| ------ | ------ | ------------------------- |
| `text` | string | One event per line: `date | title | description (optional)` (required) |

Line format: `2026-01-05 | Kickoff | decided to build the toolbox`. The date must be a real `YYYY-MM-DD`; blank lines and `#` comment lines are ignored; descriptions may contain `|`.

## Output

- Right preview panel: styled timeline (vertical / horizontal, optional gap labels)
- Copy / download: complete HTML (with inline styles, ready to embed)

## Options

| Option      | Type    | Description                                            |
| ----------- | ------- | ------------------------------------------------------ |
| `direction` | select  | `vertical` / `horizontal`, defaults to vertical        |
| `showGap`   | boolean | Label the day gaps between adjacent events, default on |

## Edge cases

- Empty input → a hint is shown on the right, no error
- Non-empty but no valid events (e.g. only comments) → bilingual error
- Invalid date (bad format / month out of range / non-existent date like 2026-02-30) → bilingual error
- Malformed line (missing `|`) or empty title → bilingual error with the line number
- More than 500 events → only the first 500 are used, with a notice above the preview
- Input over 200,000 characters → rejected with an error
- `<>&"'` in titles / descriptions are escaped before building the HTML (XSS-safe)

## Examples

### Example 1: product launch history (filled by the "Example" button)

```text
2026-01-05 | Kickoff | decided to build the online toolbox
2026-03-12 | Private beta | invited 50 users
2026-06-01 | Public beta | open registration
2026-09-27 | v0.0.4 released | 310 tools live
```

### Example 2: résumé timeline

```text
2018-09-01 | Enrolled | Computer Science, XX University
2022-06-30 | Graduated | bachelor's degree
2022-07-15 | Joined | frontend engineer
2024-03-01 | Promoted | senior frontend engineer
```

### Example 3: comments and blank lines

```text
# project milestones (lines starting with # are comments and ignored)
2025-01-01 | Requirements frozen

2025-02-15 | Development done | integration tests passed
2025-03-01 | Launched
```

## Data flow

Fully local: parsing and HTML generation happen **inside the browser**; nothing is uploaded to any server.

## Difference from #305 timeline

`timeline` (#305) is a "date-event sorting text timeline": it outputs **plain sorted text**. `timeline-gen` (#404) outputs a **styled HTML timeline** (vertical / horizontal, gap labels, inline styles) that can be downloaded and embedded in a web page.

## Meta

| Item        | Value                                                                    |
| ----------- | ------------------------------------------------------------------------ |
| Global No.  | #404                                                                     |
| Category    | `random`                                                                 |
| Group       | `design`                                                                 |
| Priority    | P2                                                                       |
| Feasibility | A (frontend only, zero deps)                                             |
| Template    | T3 (input left, preview right; the preview is rich HTML, not plain text) |
| Deps        | none                                                                     |
