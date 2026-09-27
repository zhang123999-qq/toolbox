# 排列组合（Permutations & Combinations）

输入 n 与 k，计算排列数 P(n,k)、组合数 C(n,k) 与 n!，全部用 BigInt 精确计算。

## 用途

- 排列数：从 n 个不同元素中有序取 k 个的方案数
- 组合数：从 n 个不同元素中无序取 k 个的方案数

## 输入

| 字段   | 类型   | 约束                         |
| ------ | ------ | ---------------------------- |
| `text` | string | n（非负整数，≤ 1000）        |
| `k`    | string | k（非负整数，≤ n；留空 = n） |

## 输出

```text
n = 10，k = 3
排列数 P(10,3) = 720
组合数 C(10,3) = 120
10! = 3,628,800
```

## 选项

本工具无选项。

## 算法

- P(n,k) = n·(n−1)…(n−k+1)，连乘避免先算大阶乘
- C(n,k) = P(n,k) / k!
- 全程 BigInt，无浮点精度损失；大数按千分位展示

## 边界

- 空输入 → 输出空
- n / k 非整数或为负 → 中文报错
- k > n → 中文报错
- n > 1000 → 报错（性能上限：1000! 已有 2568 位）

## 示例

输入 n=`10`、k=`3`，输出 P=720、C=120、10!=3,628,800。

## 数据流向

纯本地计算，不上传任何数据。

## English

Enter n and k to get P(n,k), C(n,k) and n!, computed exactly with BigInt (n ≤ 1000 for performance). k left blank defaults to n. All computation is done locally in the browser; no data is uploaded.

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #336                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P1                                  |
| 可行性   | A（纯 JS，BigInt）                  |
| 模板     | T2（双栏 + 附加输入框）             |
