# AST 查看

把一段 JavaScript 代码解析成**缩进的结构化 AST 树**。自研轻量词法 / 语法分析，
不依赖 acorn 等第三方解析器。

## 用途

读别人代码或调试语法时，先看清「这段代码由哪些语句块嵌套而成」比逐行读更快。
本工具把 `function / class / if / for / const` 等语句抽成一棵树，用缩进表示层级。

## 输入

| 字段   | 类型   | 约束              | 说明    |
| ------ | ------ | ----------------- | ------- |
| `text` | string | 最大 200,000 字符 | JS 源码 |

## 输出

| 字段   | 类型   | 说明              |
| ------ | ------ | ----------------- |
| `text` | string | 缩进的 AST 树文本 |

```text
Program
  FunctionDecl greet(name)
    Block
      ConstDecl msg = 'hi ' + name
      IfStmt name
        Block
          ReturnStmt msg
```

## 识别的语句结构

| 节点                            | 来源关键字                  |
| ------------------------------- | --------------------------- |
| `FunctionDecl`                  | `function`                  |
| `ClassDecl`                     | `class`（含 `extends`）     |
| `Method`/`Field`                | class 体内的方法 / 字段     |
| `ConstDecl`/`LetDecl`/`VarDecl` | `const`/`let`/`var`         |
| `IfStmt`                        | `if`（含 `else`/`else if`） |
| `ForStmt`/`WhileStmt`           | `for`/`while`               |
| `ReturnStmt`                    | `return`                    |
| `ImportDecl`/`ExportDecl`       | `import`/`export`           |
| `BreakStmt`/`ContinueStmt`      | `break`/`continue`          |
| `ExpressionStmt`                | 其它表达式语句              |
| `Block`                         | `{ ... }` 嵌套块            |

## 实现规则 / 算法

1. **词法分析**：正则切分空白 / 注释 / 字符串 / 数字 / 标识符关键字 / 标点，注释直接丢弃
2. **语法分析**：递归下降，按括号 `()[]{}` 深度跟踪嵌套；在块级按首关键字分派到对应语句节点
3. 函数参数、if/for 条件等只**收集 token 文本**作为 detail，不再细表达式树
4. 缩进 = 树深度，每级两个空格

## 浏览器边界与限制

- **不是完整 ECMAScript 解析器**：不处理箭头函数简写、对象字面量解构、
  可选链 `?.`、生成器 `*`、装饰器等；遇到会降级成 `ExpressionStmt`
- 对语法错误（括号不匹配等）会抛中文错误，但容错有限
- 不做行列号、token 类型标注
- 空输入不产出；超长报错

## 数据流向

**纯本地处理。** 浏览器内自研解析，不发送任何网络请求。
`meta.api = false`，无需自备 API/Key。

## 示例

输入：

```js
function greet(name) {
  const msg = 'hi ' + name
  if (name) {
    return msg
  }
  return 'bye'
}
```

输出（节选自上）。

## 元信息

| 项       | 值                               |
| -------- | -------------------------------- |
| 全局编号 | #276                             |
| 域       | `devops`（开发 / 运维 / 云原生） |
| 大组     | `dev`                            |
| 优先级   | P2                               |
| 可行性   | A（纯 JS）                       |
| 模板     | T2（双栏）                       |
