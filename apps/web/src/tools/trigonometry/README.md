# 三角函数

输入角度（度或弧度），一次性求 sin、cos、tan、csc、sec、cot 六个三角函数值。

## 用途

- 查任意角度的三角函数值
- 验证手算（特殊角、象限角）
- 弧度 / 度两种输入

## 输入

| 字段   | 类型   | 约束                        |
| ------ | ------ | --------------------------- |
| `text` | string | 角度数值，最大 200,000 字符 |

## 输出

```text
角度：30°（= 30° = 0.523598775598 rad）
sin = 0.5
cos = 0.866025403784
tan = 0.57735026919
csc = 2
sec = 1.15470053838
cot = 1.73205080757
```

## 选项

| 选项   | 取值                  | 默认  |
| ------ | --------------------- | ----- |
| `unit` | `deg` 度 / `rad` 弧度 | `deg` |

## 算法

- 角度先统一转弧度，再用 `Math.sin/cos` 求值；其余四个由定义式导出（tan = sin/cos，csc = 1/sin，sec = 1/cos，cot = cos/sin）。
- 分母绝对值 < 1e-12 视为 0，对应函数标「无定义」（如 tan 90°）。
- 绝对值 < 1e-12 的结果压平为 0，避免 `sin(180°) = 1.2e-16` 这类浮点残余。

## 边界

- 非数字输入 → 中文报错
- 数值保留 12 位有效数字，去尾零

## 示例

输入 `30`（度）→ sin = 0.5，cos ≈ 0.8660。

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #343                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P1                                  |
| 可行性   | A（纯 JS）                          |
| 模板     | T2（双栏 + 选项）                   |

---

# Trigonometry (English)

Enter an angle in degrees or radians and get all six trigonometric values: sin, cos, tan, csc, sec, cot.

## Usage

- Look up trig values for any angle
- Check hand calculations (special / quadrant angles)
- Degree and radian input

## Input

| Field  | Type   | Constraint                          |
| ------ | ------ | ----------------------------------- |
| `text` | string | Angle value, max 200,000 characters |

## Output

Same layout as the Chinese example above (labels follow the active UI language).

## Options

| Option | Values                        | Default |
| ------ | ----------------------------- | ------- |
| `unit` | `deg` degrees / `rad` radians | `deg`   |

## Algorithm

- Angles are converted to radians, then `Math.sin/cos` are used; the other four follow from the definitions (tan = sin/cos, csc = 1/sin, sec = 1/cos, cot = cos/sin).
- A denominator with |·| < 1e-12 is treated as 0 and the function is marked undefined (e.g. tan 90°).
- Results with |·| < 1e-12 are flattened to 0 to avoid residues like `sin(180°) = 1.2e-16`.

## Edge cases

- Non-numeric input → user-facing error
- 12 significant digits, trailing zeros stripped

## Example

Input `30` (degrees) → sin = 0.5, cos ≈ 0.8660.
