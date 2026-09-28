# BMR 计算

输入身高（cm）、体重（kg）、性别、年龄，选择公式，算基础代谢率（BMR，单位 kcal/天）。

## 用途

- 减脂 / 增肌的饮食热量规划起点
- 了解自身每日最低能量消耗

## 输入

| 字段    | 类型   | 约束                                  |
| ------- | ------ | ------------------------------------- |
| `text`  | string | 身高（cm），50–300，最大 200,000 字符 |
| `textB` | string | 体重（kg），>0 且 ≤1000               |

## 输出

```text
BMR：1648.8 kcal/天（Mifflin-St Jeor，男，30 岁）
```

## 选项

| 选项      | 类型   | 说明                                      |
| --------- | ------ | ----------------------------------------- |
| `gender`  | select | 性别：`男` `女`                           |
| `age`     | text   | 年龄：1–120 的整数                        |
| `formula` | select | 公式：`Mifflin-St Jeor` `Harris-Benedict` |

## 算法

w=体重(kg)，h=身高(cm)，a=年龄(岁)：

- Mifflin-St Jeor：男 `10w + 6.25h − 5a + 5`；女 `10w + 6.25h − 5a − 161`
- Harris-Benedict：男 `88.362 + 13.397w + 4.799h − 5.677a`；女 `447.593 + 9.247w + 3.098h − 4.33a`
- 结果保留 1 位小数（`toFixed(1)`）

## 边界

- 身高留空 → 输出空串
- 身高非数字 → 中文报错「身高请输入有效的数字」；<50 或 >300 → 「身高应在 50–300 cm 之间」
- 体重非数字 → 「体重请输入有效的数字」；≤0 → 「体重必须大于 0」；>1000 → 「体重超出合理范围」
- 年龄留空 → 「年龄不能为空」；非数字 / 非整数 / <1 / >120 → 「年龄应为 1–120 的整数」
- 性别非法 → 「性别非法」；公式非法 → 「公式非法」
- 输入 > 200,000 字符 → 报错

## 示例

身高 `175`，体重 `70`，男，30 岁，Mifflin-St Jeor：

```text
BMR：1648.8 kcal/天（Mifflin-St Jeor，男，30 岁）
```

## 元信息

| 项       | 值                            |
| -------- | ----------------------------- |
| 全局编号 | #357                          |
| 域       | `math`（数学/单位/金融/生活） |
| 大组     | `life`                        |
| 优先级   | P1                            |
| 可行性   | A（纯 JS）                    |
| 模板     | T2（双栏 + 选项）             |

## English

A basal metabolic rate calculator with Mifflin-St Jeor and Harris-Benedict formulas. Input: `text` (height in cm), `textB` (weight in kg); options: gender, age, formula. Output: e.g. `BMR：1648.8 kcal/天（Mifflin-St Jeor，男，30 岁）`.
