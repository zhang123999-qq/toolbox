# 方程求解

解一元一次方程、一元二次方程与二元一次方程组，输出判别式与求解结果。二元一次方程组的线性系统用 `mathjs` 的 `lusolve` 求解。

## 用途

- 解一元一次方程（如 `2x+3=0`）
- 解一元二次方程，含重根 / 复数根（如 `x^2-5x+6=0`）
- 解二元一次方程组（两行，如 `2x+3y=5` / `x-y=1`）

## 输入

| 字段   | 类型   | 约束                        |
| ------ | ------ | --------------------------- |
| `text` | string | 方程文本，最大 200,000 字符 |

写法：项之间用 `+`/`-` 连接，支持 `x`、`y`、`x^2`（或 `x²`），常量与系数可为小数。方程组模式下每行一个方程（恰好两行）。

## 输出

```text
模式：一元二次方程（ax² + bx + c = 0）
方程：x^2-5x+6=0
判别式 Δ = b² − 4ac = 1
解：x₁ = 2，x₂ = 3
```

## 选项

| 选项   | 取值                                                               | 默认        |
| ------ | ------------------------------------------------------------------ | ----------- |
| `mode` | `linear` 一元一次 / `quadratic` 一元二次 / `system` 二元一次方程组 | `quadratic` |

## 算法

- **一元一次**：移项得 `x = −b/a`；`a = 0` 时按恒等式 / 矛盾方程处理。
- **一元二次**：判别式 `Δ = b² − 4ac`；Δ > 0 两实根、Δ = 0 重根、Δ < 0 给出复数根；`a = 0` 退化为一元一次。
- **方程组**：化为 `Ax = b`，先用行列式判定系数矩阵非奇异，再用 mathjs `lusolve` 求解。

## 边界

- 缺少 / 多个等号 → 报错
- 无法解析的项（如 `2xy`）→ 报错
- 模式与方程类型不匹配（如一元一次模式遇到二次项）→ 报错
- 系数矩阵奇异（平行 / 重合）→ 报错

## 示例

`x^2-5x+6=0` → Δ = 1，x₁ = 2，x₂ = 3。

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #341                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P2                                  |
| 可行性   | A（纯 JS + mathjs lusolve）         |
| 模板     | T3（多面板：输入 + 选项 + 输出）    |

---

# Equation Solver (English)

Solve linear, quadratic and 2×2 linear-system equations, showing the discriminant and solution steps. Linear systems are solved with mathjs `lusolve`.

## Usage

- Linear equations like `2x+3=0`
- Quadratic equations including double / complex roots, e.g. `x^2-5x+6=0`
- 2×2 linear systems, two lines, e.g. `2x+3y=5` / `x-y=1`

## Input

| Field  | Type   | Constraint                            |
| ------ | ------ | ------------------------------------- |
| `text` | string | Equation text, max 200,000 characters |

Syntax: terms joined with `+`/`-`; supports `x`, `y`, `x^2` (or `x²`); coefficients and constants may be decimals. In system mode, one equation per line (exactly two lines).

## Output

Same layout as the Chinese example above (labels follow the active UI language).

## Options

| Option | Values                                                | Default     |
| ------ | ----------------------------------------------------- | ----------- |
| `mode` | `linear` / `quadratic` / `system` (2×2 linear system) | `quadratic` |

## Algorithm

- **Linear**: `x = −b/a`; `a = 0` is reported as an identity or a contradiction.
- **Quadratic**: discriminant `Δ = b² − 4ac`; two real roots, double root, or complex roots; degenerates to linear when `a = 0`.
- **Systems**: rewritten as `Ax = b`; the coefficient matrix is checked non-singular via its determinant, then solved with mathjs `lusolve`.

## Edge cases

- Missing / multiple `=` signs → error
- Unparseable terms (e.g. `2xy`) → error
- Mode / equation-type mismatch → error
- Singular coefficient matrix (parallel / coincident lines) → error

## Example

`x^2-5x+6=0` → Δ = 1, x₁ = 2, x₂ = 3.
