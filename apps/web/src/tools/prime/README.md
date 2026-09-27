# 质数判断（Prime Checker）

判断一个整数是否为质数；若为合数，给出最小质因数。

## 用途

- 快速判断整数是否为质数
- 合数定位其最小质因数

## 输入

| 字段   | 类型   | 约束               |
| ------ | ------ | ------------------ |
| `text` | string | 整数，\|n\| ≤ 10¹² |

## 输出

```text
n = 9999999967
是质数 ✓
注：本工具支持 |n| ≤ 10¹²，判定为确定性算法（非概率性）。
```

合数示例（输入 `100`）：

```text
n = 100
不是质数（合数）
最小质因数：2
```

## 选项

本工具无选项。

## 算法

- **判定**：确定性 Miller–Rabin。基底取 2,3,5,7,11,13,17，在 n < 3.47×10¹² 范围内无伪素数，因此在支持范围（|n| ≤ 10¹²）内结果是**精确**的，不是概率性的。
- **最小质因数**：用筛到 10⁶ 的素数表（约 7.8 万个）试除；n ≤ 10¹² 时最坏情况约 7.8 万次除法，毫秒级完成。

## 边界

- 空输入 → 输出空
- 非整数（小数 / 字母）→ 中文报错
- |n| > 10¹² → 中文报错（性能上限，避免页面卡死）
- n < 2（0、1、负数）→ 不是质数（质数是大于 1 的自然数）

## 示例

输入：`9999999967` → 是质数；输入：`100` → 合数，最小质因数 2。

## 数据流向

纯本地计算，不上传任何数据。

## English

Test whether an integer is prime (|n| ≤ 10¹²). Uses deterministic Miller–Rabin (bases 2,3,5,7,11,13,17 — exact, not probabilistic, below 3.47×10¹²). For composites, the smallest prime factor is found by trial division with a prime table sieved to 10⁶. All computation is done locally in the browser; no data is uploaded.

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #337                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P1                                  |
| 可行性   | A（纯 JS，BigInt）                  |
| 模板     | T2（双栏）                          |
