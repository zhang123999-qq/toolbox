# 随机密码批量 bulk-password（#420）

## 用途 | Purpose

- 一次生成多条随机密码，适合批量发放账号、初始化密码、测试数据。
- Generate many random passwords at once, for bulk account provisioning, password initialization, or test data.
- 与「随机密码」工具的区别：本工具一次生成多条（上限 10000）；「随机密码」工具一次只生成一条。
- Difference from the “Random Password” tool: this tool generates many passwords at once (up to 10,000); the Random Password tool generates one at a time.

## 输入 | Input

- 文本框：任意非空文本即触发生成（内容不影响结果，仅作触发用）。
- Textarea: any non-empty text triggers generation (the content does not affect the result).

## 选项 | Options

| 选项            | 说明                                  | Option         | Description                                                   |
| --------------- | ------------------------------------- | -------------- | ------------------------------------------------------------- |
| 生成数量 count  | 1–10000 的整数                        | Count          | Integer 1–10000                                               |
| 密码长度 length | 8 / 12 / 16 / 24 / 32                 | Length         | 8 / 12 / 16 / 24 / 32                                         |
| 字符集          | 小写 / 大写 / 数字 / 符号，至少选一类 | Character sets | lowercase / uppercase / digits / symbols; select at least one |

## 输出 | Output

- 每行一条密码。
- One password per line.

## 限制 | Limits

- 数量上限 10000。10000 条约 1 秒内生成，但极大输出会使页面渲染 / 复制 / 下载变慢，请按需选择数量。
- 默认使用 `crypto.getRandomValues`（CSPRNG）；当前环境不支持时明确报错，绝不静默降级为 `Math.random`。
- 字符分布均匀，但不保证每条密码都包含所选的每一类字符。

## 数据流向 | Data flow

- 全部在浏览器本地计算，无网络请求。
- All computation happens locally in the browser; no network requests.

## 示例 | Example

数量 3，长度 8，全字符集 →

```
aB3$xK9!q
Z7#mP2@wL
kQ8$nR5&v
```

（实际值随机）

## 元信息 | Meta

- 编号 #420 · category `random` · group `design` · 可行性 A · 纯前端
