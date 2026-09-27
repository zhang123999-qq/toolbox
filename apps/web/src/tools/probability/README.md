# 概率计算

三种概率计算：二项分布 P(X=k) 与累积概率、条件概率 P(A|B)、正态分布 CDF/PDF。纯 JS 实现，本地计算。

## 用途

- 二项分布：n 次独立试验中恰好 k 次成功的概率（如抛 10 次硬币恰好 3 次正面）
- 条件概率：已知 P(A)、P(B)、P(A∩B)，求 P(A|B) 与 P(B|A)，并判断独立性
- 正态分布：已知 x、均值 μ、标准差 σ，求 P(X≤x)、密度 f(x)、P(X>x)

## 输入

| 字段   | 类型   | 约束                                         |
| ------ | ------ | -------------------------------------------- |
| `text` | string | 每行一个 `key=value` 参数；最大 200,000 字符 |

各模式所需参数（key 不区分大小写）：

| 模式             | 参数                                                                       |
| ---------------- | -------------------------------------------------------------------------- |
| binomial（默认） | `n`（试验次数，非负整数）、`k`（成功次数，非负整数）、`p`（成功概率，0–1） |
| conditional      | `pa`（P(A)）、`pb`（P(B)）、`pab`（P(A∩B)），均在 0–1 内                   |
| normal           | `x`、`mu`（均值 μ）、`sigma`（标准差 σ>0）                                 |

## 输出

二项分布模式：

```text
P(X = k): 0.117188
P(X ≤ k): 0.171875
P(X ≥ k): 0.945313
期望 E[X]: 5
方差 Var(X): 2.5
```

条件概率模式输出 `P(A|B)`、`P(B|A)` 与是否独立；正态模式输出 `P(X≤x)`、`f(x)` 密度与 `P(X>x)`。

## 选项

| 选项     | 取值                            | 说明                           |
| -------- | ------------------------------- | ------------------------------ |
| 计算模式 | binomial / conditional / normal | 二项分布 / 条件概率 / 正态分布 |
| 小数位数 | 0 / 1 / 2 / 4 / 6 / 8           | 结果保留小数位数               |

## 算法

- **二项分布 PMF**：全程对数域计算 `ln C(n,k) + k·ln p + (n−k)·ln(1−p)`，n 极大也不溢出；`ln(n!)` 在 n>1e6 时切换为 Stirling 公式（O(1)）
- **二项分布 CDF**：n≤10000 时对数域递推精确求和；n 更大时用带连续性修正的正态近似 Φ((k+0.5−np)/√(np(1−p)))
- **正态分布**：误差函数 erf 用 Abramowitz & Stegun 7.1.26 近似（|误差| ≤ 1.5e-7），标准表值 Φ(1.96)≈0.9750
- **条件概率**：P(A|B)=P(A∩B)/P(B)；|P(A∩B)−P(A)P(B)|<1e-12 判为独立
- **退化情形**：p=0/1、n=0、k 越界（k<0 或 k>n → 概率 0）均按定义处理，不产生 NaN

## 边界

- 空输入 → 显示格式提示，不报错
- p=0：只有 k=0 时 P(X=k)=1；p=1：只有 k=n 时为 1
- n=0：P(X=0)=1
- k>n 或 k<0：P(X=k)=0
- P(B)=0 或 P(A)=0：条件概率无定义 → 双语报错
- σ≤0 → 双语报错
- 未知参数 / 缺失参数 / 非数字 → 双语报错（带参数名）

## 示例

输入（binomial 模式）：

```text
n=10
k=3
p=0.5
```

输出 `P(X = k): 0.117188`（= C(10,3)/2¹⁰ = 120/1024）。

## 数据流向

纯前端本地计算，不调用网络、不上传数据。

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #368                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P2                                  |
| 可行性   | A（纯 JS）                          |
| 模板     | T3（多面板 + 模式选项）             |

---

# Probability Calculator

Three kinds of probability computation: binomial P(X=k) and cumulative probabilities, conditional probability P(A|B), and normal distribution CDF/PDF. Pure JS, computed locally.

## Purpose

- Binomial: probability of exactly k successes in n independent trials (e.g. exactly 3 heads in 10 coin flips)
- Conditional: given P(A), P(B), P(A∩B), compute P(A|B) and P(B|A), plus an independence check
- Normal: given x, mean μ, std σ, compute P(X≤x), density f(x), P(X>x)

## Input

| Field  | Type   | Constraints                                           |
| ------ | ------ | ----------------------------------------------------- |
| `text` | string | One `key=value` parameter per line; max 200,000 chars |

Parameters per mode (keys are case-insensitive):

| Mode               | Parameters                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| binomial (default) | `n` (trials, non-negative integer), `k` (successes, non-negative integer), `p` (success prob, 0–1) |
| conditional        | `pa` (P(A)), `pb` (P(B)), `pab` (P(A∩B)), all within 0–1                                           |
| normal             | `x`, `mu` (mean μ), `sigma` (std σ>0)                                                              |

## Output

Binomial mode:

```text
P(X = k): 0.117188
P(X ≤ k): 0.171875
P(X ≥ k): 0.945313
Mean E[X]: 5
Variance Var(X): 2.5
```

Conditional mode outputs `P(A|B)`, `P(B|A)` and independence; normal mode outputs `P(X≤x)`, density `f(x)`, `P(X>x)`.

## Options

| Option         | Values                          | Description                     |
| -------------- | ------------------------------- | ------------------------------- |
| Mode           | binomial / conditional / normal | Binomial / conditional / normal |
| Decimal places | 0 / 1 / 2 / 4 / 6 / 8           | Decimals kept in results        |

## Algorithms

- **Binomial PMF**: computed entirely in log domain — `ln C(n,k) + k·ln p + (n−k)·ln(1−p)` — no overflow for huge n; `ln(n!)` switches to Stirling's formula for n>1e6 (O(1))
- **Binomial CDF**: exact log-domain recurrence summation for n≤10000; normal approximation with continuity correction Φ((k+0.5−np)/√(np(1−p))) beyond
- **Normal**: erf via Abramowitz & Stegun 7.1.26 (|error| ≤ 1.5e-7); table value Φ(1.96)≈0.9750
- **Conditional**: P(A|B)=P(A∩B)/P(B); independent when |P(A∩B)−P(A)P(B)|<1e-12
- **Degenerate cases**: p=0/1, n=0, out-of-range k (k<0 or k>n → probability 0) handled by definition, no NaN

## Edge cases

- Empty input → format hint, no error
- p=0: P(X=k)=1 only for k=0; p=1: only for k=n
- n=0: P(X=0)=1
- k>n or k<0: P(X=k)=0
- P(B)=0 or P(A)=0: conditional probability undefined → bilingual error
- σ≤0 → bilingual error
- Unknown / missing / non-numeric parameters → bilingual errors naming the parameter

## Example

Input (binomial mode):

```text
n=10
k=3
p=0.5
```

Output `P(X = k): 0.117188` (= C(10,3)/2¹⁰ = 120/1024).

## Data flow

Pure client-side computation. No network calls, no uploads.

## Meta

| Item        | Value       |
| ----------- | ----------- |
| Global #    | #368        |
| Category    | `math`      |
| Group       | `life`      |
| Priority    | P2          |
| Feasibility | A (pure JS) |
| Template    | T3          |
