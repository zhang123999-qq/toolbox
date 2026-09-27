# 密码短语生成 passphrase-gen（#419）

## 用途 | Purpose

- 生成「多个英文单词组成的易记短语」（如 `correct-horse-battery-staple`），适合用作需要记忆的主密码、Wi-Fi 密码等。
- Generate memorable multi-word passphrases (e.g. `correct-horse-battery-staple`), ideal as a master password you need to remember.
- 与「随机密码」工具的区别：本工具输出是多个真实英文单词组成的短语（易记、易读、易口述）；「随机密码」工具输出单个高强度随机字符串（熵更高但难记）。
- Difference from the “Random Password” tool: this tool produces phrases of real English words (memorable, readable, easy to dictate); the Random Password tool produces a single high-entropy random string (stronger entropy, harder to remember).

## 输入 | Input

- 文本框：任意非空文本即触发生成（内容不影响结果，仅作触发用）。
- Textarea: any non-empty text triggers generation (the content does not affect the result).

## 选项 | Options

| 选项                  | 说明                  | Option     | Description                 |
| --------------------- | --------------------- | ---------- | --------------------------- |
| 单词数 words          | 1–6 的整数            | Word count | Integer 1–6                 |
| 分隔符 separator      | 最多 8 个字符，可为空 | Separator  | Up to 8 chars, may be empty |
| 首字母大写 capitalize | 每个单词首字母大写    | Capitalize | Capitalize each word        |

## 输出 | Output

- 一行短语，如 `abandon-blossom-comet-dragon`。
- One passphrase line, e.g. `abandon-blossom-comet-dragon`.

## 限制 | Limits

- 内置 217 个 3–8 字母的英文单词，全部小写、无重复。
- 单词数上限 6（6 词 × 平均约 11 bit ≈ 66 bit 熵，足够抵抗离线暴力破解；再多则短语过长难记）。
- 默认使用 `crypto.getRandomValues`（CSPRNG）；当前环境不支持时明确报错，绝不静默降级为 `Math.random`。

## 数据流向 | Data flow

- 全部在浏览器本地计算，无网络请求。
- All computation happens locally in the browser; no network requests.

## 示例 | Example

单词数 4，分隔符 `-` → `correct-horse-battery-staple`（实际单词随机）。

## 元信息 | Meta

- 编号 #419 · category `random` · group `design` · 可行性 A · 纯前端
