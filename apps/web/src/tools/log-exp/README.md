# 对数指数

常用对数 lg、自然对数 ln、二进制对数 log₂、自定义底数对数与指数运算，带定义域检查。

## 用途

- 求 lg / ln / log₂
- 任意底数的对数（如 log₃ 81）
- 指数运算 eˣ、10ˣ、2ˣ

## 输入

| 字段    | 类型   | 约束                             |
| ------- | ------ | -------------------------------- |
| `text`  | string | 真数 / 指数 x，最大 200,000 字符 |
| `textB` | string | 底数（仅自定义底数模式需要）     |

## 输出

```text
函数：常用对数 lg(x)
log_10(100) = 2
```

## 选项

| 选项       | 取值                                                                                | 默认    |
| ---------- | ----------------------------------------------------------------------------------- | ------- |
| `function` | `log10` / `ln` / `log2` / `logbase` 自定义底数 / `exp` eˣ / `pow10` 10ˣ / `pow2` 2ˣ | `log10` |

## 边界

- 对数真数必须 > 0；底数必须 > 0 且 ≠ 1
- 指数模式 x 可为任意实数（负数、小数均可）
- 数值保留 12 位有效数字，去尾零

## 示例

函数选常用对数，输入 `100` → `log_10(100) = 2`。

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #344                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P1                                  |
| 可行性   | A（纯 JS）                          |
| 模板     | T2（双栏 + 选项）                   |

---

# Logarithm & Exponential (English)

Common log (lg), natural log (ln), binary log (log₂), custom-base logarithms and exponentials, with domain checks.

## Usage

- Compute lg / ln / log₂
- Logarithms with any base (e.g. log₃ 81)
- Exponentials eˣ, 10ˣ, 2ˣ

## Input

| Field   | Type   | Constraint                                    |
| ------- | ------ | --------------------------------------------- |
| `text`  | string | Argument / exponent x, max 200,000 characters |
| `textB` | string | Base (only needed for custom-base mode)       |

## Output

Same layout as the Chinese example above (labels follow the active UI language).

## Options

| Option     | Values                                                                               | Default |
| ---------- | ------------------------------------------------------------------------------------ | ------- |
| `function` | `log10` / `ln` / `log2` / `logbase` custom base / `exp` eˣ / `pow10` 10ˣ / `pow2` 2ˣ | `log10` |

## Edge cases

- Log argument must be > 0; base must be > 0 and ≠ 1
- Exponent x may be any real number (negative / fractional allowed)
- 12 significant digits, trailing zeros stripped

## Example

Function = common log, input `100` → `log_10(100) = 2`.
