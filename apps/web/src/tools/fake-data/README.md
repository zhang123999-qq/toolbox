# 假数据生成 fake-data（#375）

## 用途 | Purpose

- 按字段类型列表批量生成测试假数据，用于前端联调、数据库填充、表单演示。
- Generate fake test data in batch from a field-type list, for frontend integration, DB seeding, and form demos.

## 输入 | Input

- 文本框每行一个字段类型，支持：`name` / `email` / `phone` / `address` / `idcard` / `company` / `ip` / `date` / `username` / `uuid`。
- 留空则不生成任何输出。
- Textarea: one field type per line. Supported: `name` / `email` / `phone` / `address` / `idcard` / `company` / `ip` / `date` / `username` / `uuid`.
- Leave empty to produce no output.

## 选项 | Options

| 选项          | 说明                                       | Option   | Description                    |
| ------------- | ------------------------------------------ | -------- | ------------------------------ |
| 行数 count    | 1–20 的整数，默认 1                        | Count    | Integer 1–20, defaults to 1    |
| 语言 language | zh / en，默认 zh                           | Language | zh / en, defaults to zh        |
| 格式 format   | json（数组）/ lines（每行一条），默认 json | Format   | json / lines, defaults to json |

## 输出 | Output

- `json`：一个 JSON 数组，每行记录是一个对象。
- `lines`：每行一条 JSON 对象。
- `json`: a JSON array of row objects. `lines`: one JSON object per line.

## 限制 | Limits

- 行数上限 20；未知字段类型 / 非法选项会显示中文错误提示。
- 身份证号为符合 GB 11643 校验位规则的伪造号码，**仅用于测试，不对应任何真实个人**。
- Rows capped at 20; unknown field types / invalid options show a Chinese error.
- ID-card numbers follow the GB 11643 checksum rule but are **fabricated for testing only — they do not identify any real person**.

## 数据流向 | Data flow

- 全部在浏览器本地计算，UUID 取自 `crypto.randomUUID`，其余随机取自 `crypto.getRandomValues`，无网络请求。
- All computation happens locally; UUID from `crypto.randomUUID`, other randomness from `crypto.getRandomValues`; no network requests.

## 示例 | Example

输入 `name`、`email`、`phone`，行数 2 →

```json
[
  {
    "name": "王浩然",
    "email": "liwei1234@example.com",
    "phone": "138 1234 5678"
  },
  {
    "name": "李芳",
    "email": "zhangwei5678@163.com",
    "phone": "159 8765 4321"
  }
]
```

（实际值随机）

## 元信息 | Meta

- 编号 #375 · category `random` · group `design` · 优先级 P1 · 可行性 A · 纯前端 · deps: 无
