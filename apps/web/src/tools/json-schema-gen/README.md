# JSON Schema 生成

从一份 JSON **样本反推 JSON Schema**（可选 draft-07 / 2020-12）。

## 用途

对接下游、写接口文档、给 LLM 当输出约束的时候，手搓 Schema 又慢又容易漏字段。
丢一份真实样本进来，先把骨架生成出来再人工补约束。

## 输入

| 字段   | 类型   | 约束                |
| ------ | ------ | ------------------- |
| `text` | string | 最大 1,000,000 字符 |

## 输出

| 字段   | 类型   | 说明                                    |
| ------ | ------ | --------------------------------------- |
| `text` | string | Schema 文本（缩进两格）；空输入返回空串 |

## 选项

| 选项     | 取值                          | 默认       | 说明                                     |
| -------- | ----------------------------- | ---------- | ---------------------------------------- |
| `format` | `draft-07` \| `draft-2020-12` | `draft-07` | `$schema` 声明用哪个草案                 |
| `strict` | boolean                       | `false`    | `required` 取全部键 / 取每个样本都有的键 |

## 推断规则

| 样本                 | 产出片段                                                                             |
| -------------------- | ------------------------------------------------------------------------------------ |
| 整数 / 小数          | `{"type":"integer"}` / `{"type":"number"}`                                           |
| 字符串 / 布尔 / null | `{"type":"string"}` / `"boolean"` / `"null"`                                         |
| 数组                 | `{"type":"array","items":<元素推断结果>}`                                            |
| 空数组               | `{"type":"array"}`（元素形态无从得知，不猜）                                         |
| 对象                 | `{"type":"object","properties":{...},"required":[...],"additionalProperties":false}` |
| 元素类型不一致       | `{"anyOf":[...]}`，同形态变体自动去重                                                |

`required` 的取法由 `strict` 决定：单份样本时两者一致；样本是**对象数组**时，
元素的键合并后，非严格只把每个元素都有的键列为必填，严格则把见过的键全部列为必填。

## 限制

- **推断的结果只是下界**：样本里没出现的字段、取值范围、字符串 `format`（date-time / email / uri）、
  `nullable`、`enum` 都无从得知，产物必须人工补一轮
- 支持的关键字只有 `type` / `properties` / `required` / `items` / `anyOf` / `additionalProperties` / `$schema`
- 超过 100,000 个节点会抛 `JsonSchemaGenError`（样本太大请先取子集）
- 输入上限 1,000,000 字符

## 数据流向

**纯本地处理。** 输入内容仅在浏览器内存中处理，不发送任何网络请求，不写入服务端。
`meta.api = false`，无需自备 API/Key。

## 示例

输入：

```json
{
  "id": 1,
  "name": "工具库",
  "tags": ["json", "static"],
  "meta": { "stars": 12, "private": false }
}
```

输出：

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "id": { "type": "integer" },
    "name": { "type": "string" },
    "tags": { "type": "array", "items": { "type": "string" } },
    "meta": {
      "type": "object",
      "properties": {
        "stars": { "type": "integer" },
        "private": { "type": "boolean" }
      },
      "required": ["stars", "private"],
      "additionalProperties": false
    }
  },
  "required": ["id", "name", "tags", "meta"],
  "additionalProperties": false
}
```

## 元信息

| 项       | 值                        |
| -------- | ------------------------- |
| 全局编号 | #139                      |
| 域       | `data-format`（数据格式） |
| 大组     | `dev`                     |
| 优先级   | P1                        |
| 可行性   | A（纯 JS）                |
| 模板     | T2（双栏）                |
