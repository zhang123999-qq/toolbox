# 货币格式

用 `Intl.NumberFormat` 按货币代码、地区格式、显示方式与小数位选项格式化金额。
纯前端计算，不上传数据。

## 用途

- 发票 / 报价单 / 财务报表中的金额规范展示
- 对比不同国家/地区的货币书写习惯

## 输入

| 字段   | 类型   | 约束                           |
| ------ | ------ | ------------------------------ |
| `text` | string | 待格式化的金额（数字，可为负） |

## 输出

格式化后的金额字符串，例如：

```text
¥1,234,567.89
```

## 选项

| 选项       | 类型   | 取值                                                                      |
| ---------- | ------ | ------------------------------------------------------------------------- |
| `currency` | select | 货币代码（ISO 4217，如 CNY / USD / EUR / JPY…，共 33 种）                 |
| `locale`   | select | 地区格式（zh-CN / zh-TW / en-US / en-GB / ja-JP / ko-KR / de-DE / fr-FR） |
| `display`  | select | 显示方式：`symbol`（¥）/ `code`（CNY）/ `name`（Chinese yuan）            |
| `decimals` | select | 小数位：`auto`（按币种默认，如 JPY 0 位）或 0–6                           |

## 边界

- 金额留空 → 输出空（不报错）
- 非数字 / `Infinity` / `NaN` → 双语报错「金额无效」
- 负数合法（如 `-1234.5` → `-¥1,234.50`）
- `0` → `¥0.00`；极大值 `1e15` 正常展示
- 未知货币代码 / 地区代码 / 显示方式 / 小数位 → 双语报错
- 纯本地 `Intl` 计算，不调用任何接口

## 示例

输入：金额 `1234567.89`，货币 CNY，地区 zh-CN，符号显示，自动小数位

输出：

```text
¥1,234,567.89
```

同金额切到 USD + en-US + 代码显示：

```text
USD 1,234,567.89
```

## 数据流向

纯前端：格式化在浏览器内经 `Intl.NumberFormat` 完成，不上传任何数据，不调用外部接口。

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #365                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P1                                  |
| 可行性   | A（纯 JS，Intl）                    |
| 模板     | T2（双栏）                          |
| 依赖     | 无                                  |

## English

Currency formatter: format amounts with `Intl.NumberFormat` by currency code, locale,
display style and decimal places. Fully client-side.

Input: `text` (amount, may be negative). Options: `currency` (ISO 4217, 33 codes),
`locale` (8 locales), `display` (`symbol`/`code`/`name`), `decimals` (`auto` = per-currency
default, e.g. JPY 0 decimals, or 0–6).

Example: `1234567.89`, CNY, zh-CN → `¥1,234,567.89`.
