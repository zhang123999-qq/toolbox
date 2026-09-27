# UML 图

左侧编写 Mermaid UML 类图（`classDiagram`）代码，右侧实时渲染为 SVG 预览；可复制 / 下载源码（`.mmd`）。

## 用途

- 画类图：继承、实现、关联、聚合、组合关系
- 调试 Mermaid 类图语法（渲染失败会给出中文 / 英文双语错误）
- 导出 `.mmd` 源码，粘贴到文档 / Wiki 里复用

## 输入

| 字段   | 类型   | 约束                         |
| ------ | ------ | ---------------------------- |
| `text` | string | Mermaid UML 类图源码（必填） |

首个非空行必须是 `classDiagram`，否则视为放错了图类型并报错。

关系符号速查：`<|--`（继承）、`<|..`（实现）、`-->`（关联）、`*--`（组合）、`o--`（聚合）。

## 输出

- 右侧预览区：渲染后的 SVG 图（mermaid 在浏览器本地渲染）
- 复制 / 下载：当前输入框的 Mermaid 源码（`.mmd` 文件）

## 选项

本工具无选项。

## 边界

- 空输入 → 右侧显示引导文案，不报错
- 首行不是 `classDiagram` → 双语报错（如误粘了 ER 图代码）
- Mermaid 语法错误 → 双语「渲染失败」提示
- 输入超过 20,000 字符 → 截断至前 20,000 字符再渲染，并在预览区顶部说明
- 特殊字符（`<>&"'` 等）原样透传，不转义不删减；渲染时 mermaid 以 `strict` 安全级别过滤注入

## 示例

### 示例 1：动物继承（「示例」按钮填入）

```mermaid
classDiagram
    class Animal {
        +String name
        +int age
        +eat() void
    }
    class Dog {
        +bark() void
    }
    Animal <|-- Dog
```

### 示例 2：订单领域模型（含接口实现）

```mermaid
classDiagram
    class Order {
        -String id
        -Money total
        +place() void
        +cancel() void
    }
    class Customer {
        -String name
        +placeOrder() Order
    }
    class Money {
        -long cents
        -String currency
    }
    Customer "1" --> "*" Order : places
    Order *-- Money : total
    class Payment {
        <<interface>>
        +pay(Money amount) bool
    }
    class Alipay {
        +pay(Money amount) bool
    }
    Payment <|.. Alipay
```

### 示例 3：抽象类与备注

```mermaid
classDiagram
    class Shape {
        <<abstract>>
        -String color
        +area() double*
    }
    class Circle {
        -double radius
        +area() double
    }
    class Rectangle {
        -double width
        -double height
        +area() double
    }
    Shape <|-- Circle
    Shape <|-- Rectangle
    note for Shape "所有图形的基类"
```

## 数据流向

纯本地：代码只在**浏览器内**由 mermaid 渲染为 SVG，不上传到任何服务器。

## 元信息

| 项       | 值                                                     |
| -------- | ------------------------------------------------------ |
| 全局编号 | #402                                                   |
| 域       | `random`（随机 / 生成 / 设计）                         |
| 大组     | `design`                                               |
| 优先级   | P2                                                     |
| 可行性   | A（纯前端，mermaid 本地渲染）                          |
| 模板     | T3（左代码右预览；T2 右栏为纯文本，无法承载 SVG 预览） |
| 依赖     | `mermaid`（动态导入，独立分包）                        |

---

# UML Diagram (English)

Write Mermaid UML class diagram (`classDiagram`) code on the left; the right panel renders a live SVG preview. Copy or download the source (`.mmd`).

## Purpose

- Draw class diagrams: inheritance, implementation, association, aggregation, composition
- Debug Mermaid class diagram syntax (render failures show a bilingual error)
- Export `.mmd` source for reuse in docs / wikis

## Input

| Field  | Type   | Constraint                                  |
| ------ | ------ | ------------------------------------------- |
| `text` | string | Mermaid UML class diagram source (required) |

The first non-empty line must be `classDiagram`; otherwise the tool reports that the wrong diagram type was pasted.

Relationship cheatsheet: `<|--` (inheritance), `<|..` (implementation), `-->` (association), `*--` (composition), `o--` (aggregation).

## Output

- Right preview panel: the rendered SVG (rendered locally in the browser by mermaid)
- Copy / download: the Mermaid source from the input box (as an `.mmd` file)

## Options

None.

## Edge cases

- Empty input → a hint is shown on the right, no error
- First line is not `classDiagram` → bilingual error (e.g. ER diagram code pasted by mistake)
- Mermaid syntax error → bilingual "render failed" message
- Input over 20,000 characters → truncated to the first 20,000 characters before rendering, with a notice above the preview
- Special characters (`<>&"'` etc.) pass through untouched; mermaid renders with `strict` security level to filter injections

## Examples

### Example 1: animal inheritance (filled by the "Example" button)

```mermaid
classDiagram
    class Animal {
        +String name
        +int age
        +eat() void
    }
    class Dog {
        +bark() void
    }
    Animal <|-- Dog
```

### Example 2: order domain model (with interface)

```mermaid
classDiagram
    class Order {
        -String id
        -Money total
        +place() void
        +cancel() void
    }
    class Customer {
        -String name
        +placeOrder() Order
    }
    class Money {
        -long cents
        -String currency
    }
    Customer "1" --> "*" Order : places
    Order *-- Money : total
    class Payment {
        <<interface>>
        +pay(Money amount) bool
    }
    class Alipay {
        +pay(Money amount) bool
    }
    Payment <|.. Alipay
```

### Example 3: abstract class with a note

```mermaid
classDiagram
    class Shape {
        <<abstract>>
        -String color
        +area() double*
    }
    class Circle {
        -double radius
        +area() double
    }
    class Rectangle {
        -double width
        -double height
        +area() double
    }
    Shape <|-- Circle
    Shape <|-- Rectangle
    note for Shape "Base class of all shapes"
```

## Data flow

Fully local: the code is rendered to SVG **inside the browser** by mermaid; nothing is uploaded to any server.

## Meta

| Item        | Value                                                                                         |
| ----------- | --------------------------------------------------------------------------------------------- |
| Global No.  | #402                                                                                          |
| Category    | `random`                                                                                      |
| Group       | `design`                                                                                      |
| Priority    | P2                                                                                            |
| Feasibility | A (frontend only, mermaid renders locally)                                                    |
| Template    | T3 (code left, preview right; T2's right column is plain text and cannot host an SVG preview) |
| Deps        | `mermaid` (dynamically imported, separate chunk)                                              |
