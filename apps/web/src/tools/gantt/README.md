# 甘特图

左侧编写 Mermaid 甘特图（`gantt`）代码，右侧实时渲染为 SVG 预览；可复制 / 下载源码（`.mmd`）。

## 用途

- 画项目排期、里程碑、关键路径
- 调试 Mermaid 甘特图语法（渲染失败会给出中文 / 英文双语错误）
- 导出 `.mmd` 源码，粘贴到文档 / Wiki 里复用

## 输入

| 字段   | 类型   | 约束                       |
| ------ | ------ | -------------------------- |
| `text` | string | Mermaid 甘特图源码（必填） |

首个非空行必须是 `gantt`，否则视为放错了图类型并报错。

任务行速记：`任务名 :id, 2026-10-01, 5d`（日期+时长）或 `任务名 :after 前置id, 5d`（依赖）；`done` / `active` / `crit` / `milestone` 修饰状态。

## 输出

- 右侧预览区：渲染后的 SVG 图（mermaid 在浏览器本地渲染）
- 复制 / 下载：当前输入框的 Mermaid 源码（`.mmd` 文件）

## 选项

本工具无选项。

## 边界

- 空输入 → 右侧显示引导文案，不报错
- 首行不是 `gantt` → 双语报错（如误粘了 ER 图代码）
- Mermaid 语法错误 → 双语「渲染失败」提示
- 输入超过 20,000 字符 → 截断至前 20,000 字符再渲染，并在预览区顶部说明
- 特殊字符（`<>&"'` 等）原样透传，不转义不删减；渲染时 mermaid 以 `strict` 安全级别过滤注入

## 示例

### 示例 1：项目排期（「示例」按钮填入）

```mermaid
gantt
    title 项目排期示例
    dateFormat YYYY-MM-DD
    section 需求
    需求评审      :done,    des1, 2026-10-01, 2026-10-03
    原型设计      :active,  des2, 2026-10-04, 3d
    section 开发
    后端开发      :         dev1, 2026-10-07, 10d
    前端开发      :         dev2, after dev1, 8d
    section 测试
    联调测试      :         test1, after dev2, 5d
```

### 示例 2：里程碑与关键路径

```mermaid
gantt
    title 带里程碑与关键路径
    dateFormat YYYY-MM-DD
    section 里程碑
    需求冻结      :milestone, m1, 2026-11-01, 0d
    上线          :milestone, m2, 2026-12-15, 0d
    section 研发
    核心功能      :crit,    c1, 2026-11-01, 20d
    边缘功能      :         c2, 2026-11-10, 15d
    回归测试      :crit,    c3, after c1, 10d
```

### 示例 3：排除周末

```mermaid
gantt
    title 排除周末的排期
    dateFormat YYYY-MM-DD
    excludes weekends
    section 阶段一
    任务 A        :a1, 2026-10-12, 5d
    任务 B        :a2, after a1, 5d
    section 阶段二
    任务 C        :b1, 2026-10-26, 7d
```

## 数据流向

纯本地：代码只在**浏览器内**由 mermaid 渲染为 SVG，不上传到任何服务器。

## 元信息

| 项       | 值                                                     |
| -------- | ------------------------------------------------------ |
| 全局编号 | #403                                                   |
| 域       | `random`（随机 / 生成 / 设计）                         |
| 大组     | `design`                                               |
| 优先级   | P2                                                     |
| 可行性   | A（纯前端，mermaid 本地渲染）                          |
| 模板     | T3（左代码右预览；T2 右栏为纯文本，无法承载 SVG 预览） |
| 依赖     | `mermaid`（动态导入，独立分包）                        |

---

# Gantt Chart (English)

Write Mermaid Gantt chart (`gantt`) code on the left; the right panel renders a live SVG preview. Copy or download the source (`.mmd`).

## Purpose

- Draw project schedules, milestones, and critical paths
- Debug Mermaid Gantt syntax (render failures show a bilingual error)
- Export `.mmd` source for reuse in docs / wikis

## Input

| Field  | Type   | Constraint                            |
| ------ | ------ | ------------------------------------- |
| `text` | string | Mermaid Gantt chart source (required) |

The first non-empty line must be `gantt`; otherwise the tool reports that the wrong diagram type was pasted.

Task line cheatsheet: `Task :id, 2026-10-01, 5d` (date + duration) or `Task :after prevId, 5d` (dependency); `done` / `active` / `crit` / `milestone` mark states.

## Output

- Right preview panel: the rendered SVG (rendered locally in the browser by mermaid)
- Copy / download: the Mermaid source from the input box (as an `.mmd` file)

## Options

None.

## Edge cases

- Empty input → a hint is shown on the right, no error
- First line is not `gantt` → bilingual error (e.g. ER diagram code pasted by mistake)
- Mermaid syntax error → bilingual "render failed" message
- Input over 20,000 characters → truncated to the first 20,000 characters before rendering, with a notice above the preview
- Special characters (`<>&"'` etc.) pass through untouched; mermaid renders with `strict` security level to filter injections

## Examples

### Example 1: project schedule (filled by the "Example" button)

```mermaid
gantt
    title Project schedule
    dateFormat YYYY-MM-DD
    section Planning
    Review     :done,   des1, 2026-10-01, 2026-10-03
    Prototype  :active, des2, 2026-10-04, 3d
    section Dev
    Backend    :        dev1, 2026-10-07, 10d
    Frontend   :        dev2, after dev1, 8d
    section QA
    Integration:test1, after dev2, 5d
```

### Example 2: milestones and critical path

```mermaid
gantt
    title Milestones & critical path
    dateFormat YYYY-MM-DD
    section Milestones
    Freeze     :milestone, m1, 2026-11-01, 0d
    Launch     :milestone, m2, 2026-12-15, 0d
    section Dev
    Core       :crit, c1, 2026-11-01, 20d
    Edge       :      c2, 2026-11-10, 15d
    Regression :crit, c3, after c1, 10d
```

### Example 3: excluding weekends

```mermaid
gantt
    title Schedule excluding weekends
    dateFormat YYYY-MM-DD
    excludes weekends
    section Phase 1
    Task A :a1, 2026-10-12, 5d
    Task B :a2, after a1, 5d
    section Phase 2
    Task C :b1, 2026-10-26, 7d
```

## Data flow

Fully local: the code is rendered to SVG **inside the browser** by mermaid; nothing is uploaded to any server.

## Meta

| Item        | Value                                                                                         |
| ----------- | --------------------------------------------------------------------------------------------- |
| Global No.  | #403                                                                                          |
| Category    | `random`                                                                                      |
| Group       | `design`                                                                                      |
| Priority    | P2                                                                                            |
| Feasibility | A (frontend only, mermaid renders locally)                                                    |
| Template    | T3 (code left, preview right; T2's right column is plain text and cannot host an SVG preview) |
| Deps        | `mermaid` (dynamically imported, separate chunk)                                              |
