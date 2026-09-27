# ER 图生成

左侧编写 Mermaid ER 图（`erDiagram`）代码，右侧实时渲染为 SVG 预览；可复制 / 下载源码（`.mmd`）。

## 用途

- 画数据库表结构、实体关系图
- 调试 Mermaid ER 图语法（渲染失败会给出中文 / 英文双语错误）
- 导出 `.mmd` 源码，粘贴到文档 / Wiki 里复用

## 输入

| 字段   | 类型   | 约束                      |
| ------ | ------ | ------------------------- |
| `text` | string | Mermaid ER 图源码（必填） |

首个非空行必须是 `erDiagram`，否则视为放错了图类型并报错。

关系符号速查：`||--o{`（一对多）、`||--||`（一对一）、`}|--|{`（多对多）；字段后可标注 `PK` / `FK`。

## 输出

- 右侧预览区：渲染后的 SVG 图（mermaid 在浏览器本地渲染）
- 复制 / 下载：当前输入框的 Mermaid 源码（`.mmd` 文件）

## 选项

本工具无选项。

## 边界

- 空输入 → 右侧显示引导文案，不报错
- 首行不是 `erDiagram` → 双语报错（如误粘了时序图代码）
- Mermaid 语法错误 → 双语「渲染失败」提示
- 输入超过 20,000 字符 → 截断至前 20,000 字符再渲染，并在预览区顶部说明
- 特殊字符（`<>&"'` 等）原样透传，不转义不删减；渲染时 mermaid 以 `strict` 安全级别过滤注入

## 示例

### 示例 1：博客用户与文章（「示例」按钮填入）

```mermaid
erDiagram
    USER ||--o{ POST : writes
    USER {
        int id PK
        string name
        string email
    }
    POST {
        int id PK
        int author_id FK
        string title
        text body
    }
```

### 示例 2：电商订单（含联合主键）

```mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    PRODUCT ||--o{ LINE_ITEM : "ordered in"
    CUSTOMER {
        string id PK
        string name
        string phone
    }
    ORDER {
        string id PK
        string customer_id FK
        date created_at
    }
    LINE_ITEM {
        string order_id PK,FK
        string product_id PK,FK
        int quantity
    }
    PRODUCT {
        string id PK
        string name
        float price
    }
```

### 示例 3：选课系统（多对多）

```mermaid
erDiagram
    STUDENT }|--|{ ENROLLMENT : takes
    COURSE }|--|{ ENROLLMENT : has
    TEACHER ||--o{ COURSE : teaches
    STUDENT {
        int id PK
        string name
    }
    COURSE {
        int id PK
        string title
    }
    ENROLLMENT {
        int student_id PK,FK
        int course_id PK,FK
        string grade
    }
    TEACHER {
        int id PK
        string name
    }
```

## 数据流向

纯本地：代码只在**浏览器内**由 mermaid 渲染为 SVG，不上传到任何服务器。

## 元信息

| 项       | 值                                                     |
| -------- | ------------------------------------------------------ |
| 全局编号 | #401                                                   |
| 域       | `random`（随机 / 生成 / 设计）                         |
| 大组     | `design`                                               |
| 优先级   | P2                                                     |
| 可行性   | A（纯前端，mermaid 本地渲染）                          |
| 模板     | T3（左代码右预览；T2 右栏为纯文本，无法承载 SVG 预览） |
| 依赖     | `mermaid`（动态导入，独立分包）                        |

---

# ER Diagram Generator (English)

Write Mermaid ER diagram (`erDiagram`) code on the left; the right panel renders a live SVG preview. Copy or download the source (`.mmd`).

## Purpose

- Draw database schemas and entity-relationship diagrams
- Debug Mermaid ER syntax (render failures show a bilingual error)
- Export `.mmd` source for reuse in docs / wikis

## Input

| Field  | Type   | Constraint                           |
| ------ | ------ | ------------------------------------ |
| `text` | string | Mermaid ER diagram source (required) |

The first non-empty line must be `erDiagram`; otherwise the tool reports that the wrong diagram type was pasted.

Relationship cheatsheet: `||--o{` (one-to-many), `||--||` (one-to-one), `}|--|{` (many-to-many); fields may carry `PK` / `FK` markers.

## Output

- Right preview panel: the rendered SVG (rendered locally in the browser by mermaid)
- Copy / download: the Mermaid source from the input box (as an `.mmd` file)

## Options

None.

## Edge cases

- Empty input → a hint is shown on the right, no error
- First line is not `erDiagram` → bilingual error (e.g. sequence diagram code pasted by mistake)
- Mermaid syntax error → bilingual "render failed" message
- Input over 20,000 characters → truncated to the first 20,000 characters before rendering, with a notice above the preview
- Special characters (`<>&"'` etc.) pass through untouched; mermaid renders with `strict` security level to filter injections

## Examples

### Example 1: blog users and posts (filled by the "Example" button)

```mermaid
erDiagram
    USER ||--o{ POST : writes
    USER {
        int id PK
        string name
        string email
    }
    POST {
        int id PK
        int author_id FK
        string title
        text body
    }
```

### Example 2: e-commerce orders (composite keys)

```mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    PRODUCT ||--o{ LINE_ITEM : "ordered in"
    CUSTOMER {
        string id PK
        string name
        string phone
    }
    ORDER {
        string id PK
        string customer_id FK
        date created_at
    }
    LINE_ITEM {
        string order_id PK,FK
        string product_id PK,FK
        int quantity
    }
    PRODUCT {
        string id PK
        string name
        float price
    }
```

### Example 3: course enrollment (many-to-many)

```mermaid
erDiagram
    STUDENT }|--|{ ENROLLMENT : takes
    COURSE }|--|{ ENROLLMENT : has
    TEACHER ||--o{ COURSE : teaches
    STUDENT {
        int id PK
        string name
    }
    COURSE {
        int id PK
        string title
    }
    ENROLLMENT {
        int student_id PK,FK
        int course_id PK,FK
        string grade
    }
    TEACHER {
        int id PK
        string name
    }
```

## Data flow

Fully local: the code is rendered to SVG **inside the browser** by mermaid; nothing is uploaded to any server.

## Meta

| Item        | Value                                                                                         |
| ----------- | --------------------------------------------------------------------------------------------- |
| Global No.  | #401                                                                                          |
| Category    | `random`                                                                                      |
| Group       | `design`                                                                                      |
| Priority    | P2                                                                                            |
| Feasibility | A (frontend only, mermaid renders locally)                                                    |
| Template    | T3 (code left, preview right; T2's right column is plain text and cannot host an SVG preview) |
| Deps        | `mermaid` (dynamically imported, separate chunk)                                              |
