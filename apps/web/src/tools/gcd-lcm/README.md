# GCD/LCM

求两个整数的最大公约数（GCD）与最小公倍数（LCM），附互质判断。内部用 `BigInt` 做欧几里得算法，任意大整数都能精确计算。

## 用途

- 求两个数的最大公约数 / 最小公倍数
- 判断两数是否互质
- 通分、化简分数前找公约数

## 输入

| 字段    | 类型   | 约束                                |
| ------- | ------ | ----------------------------------- |
| `text`  | string | 整数 A，最大 200,000 字符           |
| `textB` | string | 整数 B（可空，留空时默认与 A 相同） |

只接受十进制整数（可带 `+`/`-` 号与前导零）；小数、指数记法、非数字一律报错。

## 输出

```text
整数 A：12
整数 B：18
最大公约数（GCD）：6
最小公倍数（LCM）：36
互质：否
```

## 选项

本工具无选项。

## 算法

- **GCD**：欧几里得辗转相除法，`gcd(a, b) = gcd(b, a mod b)`；负数先取绝对值。
- **LCM**：`|a·b| / gcd(a, b)`；任一输入为 0 时 LCM = 0。
- 全程 `BigInt` 运算，不经过 `Number`，避免 2^53 精度损失。

## 边界

- 任一输入非整数 → 中文报错
- 两个输入都为 0：GCD = 0、LCM = 0
- 互质（GCD = 1）且两数非零时标注「互质：是」

## 示例

输入 A = `12`，B = `18` → GCD = `6`，LCM = `36`。

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #339                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P1                                  |
| 可行性   | A（纯 JS，BigInt）                  |
| 模板     | T2（双栏 + 附加输入框）             |

---

# GCD / LCM (English)

Compute the greatest common divisor (GCD) and least common multiple (LCM) of two integers, with a coprimality check. Uses the Euclidean algorithm on `BigInt`, so arbitrarily large integers are handled exactly.

## Usage

- Find the GCD / LCM of two numbers
- Check whether two numbers are coprime
- Find common factors before reducing fractions

## Input

| Field   | Type   | Constraint                                     |
| ------- | ------ | ---------------------------------------------- |
| `text`  | string | Integer A, max 200,000 characters              |
| `textB` | string | Integer B (optional; defaults to A when empty) |

Only decimal integers are accepted (optional `+`/`-` sign and leading zeros). Decimals, exponent notation and non-numeric input raise an error.

## Output

```text
整数 A：12
整数 B：18
最大公约数（GCD）：6
最小公倍数（LCM）：36
互质：否
```

(Output labels are rendered in the active UI language; the numeric results are language-independent.)

## Options

None.

## Algorithm

- **GCD**: Euclidean algorithm `gcd(a, b) = gcd(b, a mod b)`; negatives are converted to absolute values first.
- **LCM**: `|a·b| / gcd(a, b)`; LCM is 0 when either input is 0.
- All arithmetic is done with `BigInt`, never `Number`, so no 2^53 precision loss.

## Edge cases

- Non-integer input → user-facing error
- Both inputs 0: GCD = 0, LCM = 0
- Coprime pairs (GCD = 1, both non-zero) are labelled as coprime

## Example

A = `12`, B = `18` → GCD = `6`, LCM = `36`.
