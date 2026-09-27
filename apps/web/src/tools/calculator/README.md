# 科学计算器

输入 mathjs 表达式，输出求值结果。支持四则运算、三角函数、对数、开方、阶乘与常量 `pi`、`e`。

## 用途

- 日常四则运算与科学计算
- 三角函数、对数、开方、阶乘求值
- 用 mathjs 表达式语法写复杂公式

## 输入

| 字段   | 类型   | 约束                             |
| ------ | ------ | -------------------------------- |
| `text` | string | mathjs 表达式，最大 200,000 字符 |

## 输出

```text
32.707106781187
```

输出为 mathjs `format(value, { precision: 14 })` 的结果，自动压平 `0.1+0.2` 这类浮点噪声（输出 `0.3`）。

## 选项

本工具无选项。

## 语法

- **四则运算**：`+` `-` `*` `/` `%`（取余）、`^`（乘方）、括号 `()`
- **三角函数**：`sin` `cos` `tan` `asin` `acos` `atan`；角度可用 `deg` 单位（如 `sin(45 deg)`），默认弧度
- **对数**：`log(x, base)`（如 `log(100, 10)`）、`log(x)`（自然对数，如 `log(e)`）
- **开方**：`sqrt(x)`、`cbrt(x)`、`nthRoot(x, n)`
- **阶乘**：`5!` 或 `factorial(5)`
- **常量**：`pi`、`e`、`tau`、`phi`
- 更多函数见 mathjs 官方文档（`abs`、`floor`、`ceil`、`round`、`gcd`、`lcm` 等均可直接用）

## 边界

- 空输入 → 输出空
- 表达式语法错误 → 中文报错
- 输入 > 200,000 字符 → 报错
- 纯本地计算（mathjs 在浏览器内求值），不上传数据

## 示例

输入：`sqrt(2^10) + sin(45 deg)`

输出：`32.707106781187`

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #311                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P0                                  |
| 可行性   | A（纯 JS，mathjs 表达式求值）       |
| 模板     | T2（双栏）                          |
| 依赖     | mathjs                              |

## English

Scientific calculator: enter a mathjs expression and get the evaluated result. Supports arithmetic, trigonometric functions, logarithms, roots, factorial and constants `pi`, `e`.

Input: `text` (string, a mathjs expression, max 200,000 chars). Output: the evaluated result formatted with 14 significant digits (e.g. `0.1+0.2` → `0.3`).

Example: input `sqrt(2^10) + sin(45 deg)` → output `32.707106781187`.
