# 程序员计算器

输入整数字面量与位运算表达式，求值后输出十 / 十六 / 八 / 二进制四行对照。全程 BigInt 运算，任意精度。

## 用途

- 位运算（`&` `|` `^` `~` `<<` `>>`）求值
- 一次看到结果在四种进制下的表示
- 大整数精确计算（超出 64 位也不丢失精度）

## 输入

| 字段   | 类型   | 约束                          |
| ------ | ------ | ----------------------------- |
| `text` | string | 整数表达式，最大 200,000 字符 |

## 输出

```text
十进制：14
十六进制：0xE
八进制：0o16
二进制：0b1110
```

负数结果：十进制照常显示负号，十六 / 八 / 二进制取绝对值表示（如 `-255` → `0xFF` / `0o377` / `0b11111111`）。

## 选项

本工具无选项。

## 算法

手写 tokenizer + shunting-yard（未使用 `eval` / `Function`）：

- **字面量**：`0b`（二进制）、`0o`（八进制）、`0x`（十六进制）前缀与十进制整数字面量
- **运算符**：括号、单目 `-` 和 `~`、双目 `+ - * / % << >> & ^ |`
- **优先级**（C 语言）：单目 > `*` `/` `%` > `+` `-` > `<<` `>>` > `&` > `^` > `|`
- **除法**：向零取整（`7/2=3`，`-7/2=-3`）；除数为 0 报错
- **移位**：移位位数须在 0–1,000,000 范围内

## 边界

- 空输入 → 输出空
- 小数输入（如 `3.5`）→ 直接报错「仅支持整数运算」
- 非法字面量 / 括号不匹配 / 残缺表达式 → 中文报错
- 输入 > 200,000 字符 → 报错
- 纯本地计算，不上传数据

## 示例

输入：`0xFF & 0b1010 | 12`

输出：

```text
十进制：14
十六进制：0xE
八进制：0o16
二进制：0b1110
```

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #312                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P0                                  |
| 可行性   | A（纯 JS，手写表达式解析）          |
| 模板     | T2（双栏）                          |

## English

Programmer calculator: evaluate integer/bitwise expressions and show the result in DEC/HEX/OCT/BIN side by side. Uses BigInt for arbitrary precision; no `eval` is used.

Input: `text` (string, an integer expression with `0b`/`0o`/`0x` literals, max 200,000 chars). Output: four lines `十进制：…` / `十六进制：0x…` / `八进制：0o…` / `二进制：0b…`. Negative results keep the minus sign in decimal and use absolute values in the other bases.

Example: input `0xFF & 0b1010 | 12` → `十进制：14` / `十六进制：0xE` / `八进制：0o16` / `二进制：0b1110`.
