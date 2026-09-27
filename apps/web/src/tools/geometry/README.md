# 几何计算

常见平面与立体图形的周长、面积、表面积、体积计算，并附上所用公式。

## 用途

- 平面图形：正方形、矩形、三角形、圆的周长与面积
- 立体图形：立方体、球体、圆柱体、圆锥体的表面积与体积
- 顺带查公式

## 输入

| 字段   | 类型   | 约束                        |
| ------ | ------ | --------------------------- |
| `text` | string | 图形参数，最大 200,000 字符 |

参数两种写法：`key=value` 每行一个（如 `r=5`），或裸数字按顺序填充（如 `3\n4` 表示长 3 宽 4）。参数名支持中英文别名：`r`/`半径`、`h`/`高`、`a`/`边长`、`b`/`宽`。

| 图形   | 参数               |
| ------ | ------------------ |
| 正方形 | `a` 边长           |
| 矩形   | `a` 长、`b` 宽     |
| 三角形 | `a`、`b`、`c` 三边 |
| 圆     | `r` 半径           |
| 立方体 | `a` 边长           |
| 球体   | `r` 半径           |
| 圆柱体 | `r` 半径、`h` 高   |
| 圆锥体 | `r` 半径、`h` 高   |

## 输出

```text
图形：圆
参数：半径 r=5
直径：10
周长：31.41592654
面积：78.53981634

公式：
直径 = 2r
周长 = 2πr
面积 = πr²
```

## 选项

| 选项    | 取值                                                                                     | 默认     |
| ------- | ---------------------------------------------------------------------------------------- | -------- |
| `shape` | `square` / `rectangle` / `triangle` / `circle` / `cube` / `sphere` / `cylinder` / `cone` | `circle` |

## 边界

- 参数必须为正数；三角形三边需满足三角形不等式
- 缺少参数 / 未知参数名 / 非数字 → 中文报错
- 数值保留 10 位有效数字，去尾零

## 示例

图形选圆，输入 `r=5` → 周长 `31.41592654`，面积 `78.53981634`。

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #342                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P2                                  |
| 可行性   | A（纯 JS）                          |
| 模板     | T3（多面板：输入 + 选项 + 输出）    |

---

# Geometry Calculator (English)

Compute perimeter, area, surface area and volume for common 2D/3D shapes, with the formulas used.

## Usage

- 2D: square, rectangle, triangle, circle — perimeter and area
- 3D: cube, sphere, cylinder, cone — surface area and volume
- Look up the formulas at the same time

## Input

| Field  | Type   | Constraint                               |
| ------ | ------ | ---------------------------------------- |
| `text` | string | Shape parameters, max 200,000 characters |

Two syntaxes: `key=value` one per line (e.g. `r=5`), or bare numbers in order (e.g. `3\n4` for a 3×4 rectangle). Parameter names accept English/Chinese aliases: `r`/`半径` (radius), `h`/`高` (height), `a`/`边长` (side), `b`/`宽` (width).

| Shape     | Parameters             |
| --------- | ---------------------- |
| Square    | `a` side               |
| Rectangle | `a` length, `b` width  |
| Triangle  | `a`, `b`, `c` sides    |
| Circle    | `r` radius             |
| Cube      | `a` side               |
| Sphere    | `r` radius             |
| Cylinder  | `r` radius, `h` height |
| Cone      | `r` radius, `h` height |

## Output

Same layout as the Chinese example above (labels follow the active UI language).

## Options

| Option  | Values                                                                                   | Default  |
| ------- | ---------------------------------------------------------------------------------------- | -------- |
| `shape` | `square` / `rectangle` / `triangle` / `circle` / `cube` / `sphere` / `cylinder` / `cone` | `circle` |

## Edge cases

- Parameters must be positive; triangle sides must satisfy the triangle inequality
- Missing parameters / unknown names / non-numeric values → user-facing error
- 10 significant digits, trailing zeros stripped

## Example

Shape = circle, input `r=5` → perimeter `31.41592654`, area `78.53981634`.
