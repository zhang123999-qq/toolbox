# 矩阵计算

矩阵加减乘、行列式、逆矩阵与转置。输入为文本矩阵（每行一排、空格分隔），运算由 `mathjs` 完成。

## 用途

- 矩阵加 / 减 / 乘
- 求行列式、逆矩阵、转置
- 验证线性代数手算结果

## 输入

| 字段    | 类型   | 约束                         |
| ------- | ------ | ---------------------------- |
| `text`  | string | 矩阵 A，最大 200,000 字符    |
| `textB` | string | 矩阵 B（加 / 减 / 乘时必填） |

矩阵格式：行之间用换行（或 `;`）分隔，列之间用空格 / 逗号 / 制表符分隔；也接受 `[[1,2],[3,4]]` 这样的 JSON 数组。单边尺寸上限 20。

## 输出

```text
运算：逆矩阵（A⁻¹）
矩阵 A（2×2）：
1  2
3  4
逆矩阵 A⁻¹：
 -2    1
1.5 -0.5
```

## 选项

| 选项        | 取值                                                                                                        | 默认      |
| ----------- | ----------------------------------------------------------------------------------------------------------- | --------- |
| `operation` | `add` 加法 / `subtract` 减法 / `multiply` 乘法 / `determinant` 行列式 / `inverse` 逆矩阵 / `transpose` 转置 | `inverse` |

## 边界

- 各行列数不一致 → 报错
- 行列式 / 逆矩阵要求方阵
- 奇异矩阵（行列式为 0）求逆 → 报错
- 加减法要求同维度；乘法要求 A 列数 = B 行数
- 元素必须为有限数字；尺寸上限 20×20

## 示例

A = `1 2\n3 4`，运算选逆矩阵 → `A⁻¹ = [[-2, 1], [1.5, -0.5]]`。

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #340                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P2                                  |
| 可行性   | A（纯 JS + mathjs）                 |
| 模板     | T3（多面板：输入 + 选项 + 输出）    |

---

# Matrix Calculator (English)

Matrix addition, subtraction and multiplication, plus determinant, inverse and transpose. Matrices are entered as text (one row per line, space-separated); all computation is done by `mathjs`.

## Usage

- Add / subtract / multiply matrices
- Compute determinant, inverse, transpose
- Check linear-algebra homework by hand

## Input

| Field   | Type   | Constraint                        |
| ------- | ------ | --------------------------------- |
| `text`  | string | Matrix A, max 200,000 characters  |
| `textB` | string | Matrix B (required for + / − / ×) |

Matrix format: rows separated by newlines (or `;`), columns by spaces / commas / tabs; JSON arrays like `[[1,2],[3,4]]` are also accepted. Maximum dimension is 20 per side.

## Output

Same layout as the Chinese example above (labels follow the active UI language).

## Options

| Option      | Values                                                                    | Default   |
| ----------- | ------------------------------------------------------------------------- | --------- |
| `operation` | `add` / `subtract` / `multiply` / `determinant` / `inverse` / `transpose` | `inverse` |

## Edge cases

- Rows with different column counts → error
- Determinant / inverse require a square matrix
- Singular matrices (determinant 0) have no inverse → error
- +/− require equal dimensions; × requires A.columns = B.rows
- Elements must be finite numbers; max 20×20

## Example

A = `1 2\n3 4`, operation = inverse → `A⁻¹ = [[-2, 1], [1.5, -0.5]]`.
