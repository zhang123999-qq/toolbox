# Avro 解析

解析用 JSON 描述的 [Apache Avro](https://avro.apache.org/) Schema，输出：

1. **字段树**：`├─ / └─` 层级结构 + 类型统计（各类型计数、字段总数、嵌套深度、命名类型清单）
2. **JSON Schema 粗略映射**：把 Avro 类型翻译成等价的 JSON Schema（2020-12）草稿

纯本地解析，不依赖 `avsc` 等第三方库。

## 用途

快速读懂 Kafka / Hadoop / 数据湖里的 Avro schema：字段是否可空、有哪些枚举 / 数组 / 嵌套 record、
命名类型如何引用；并得到一份可用于文档或校验的 JSON Schema 草稿。

## 输入

| 字段   | 类型   | 约束                                                                            |
| ------ | ------ | ------------------------------------------------------------------------------- |
| `text` | string | 最大 200,000 字符；合法 JSON 表示的 Avro Schema（record 等对象，或 union 数组） |

## 输出

| 字段   | 类型   | 说明                                        |
| ------ | ------ | ------------------------------------------- |
| `text` | string | 字段树 + 统计 / JSON Schema；空输入返回空串 |

## 选项

| 选项     | 取值                     | 默认   | 说明                             |
| -------- | ------------------------ | ------ | -------------------------------- |
| `mode`   | both / tree / jsonSchema | `both` | 输出字段树、仅树、仅 JSON Schema |
| `indent` | 2 / 4                    | `2`    | JSON Schema 段的缩进宽度         |

## 支持的 Avro 构造

- 8 个原生类型：`null boolean int long float double bytes string`
- 复合类型：`record / error / enum / array / map / fixed`
- union（联合类型）：`["null","string"]` 等；含 `null` 的字段在 JSON Schema 里不进 `required`
- 命名类型与 `namespace` 继承：全名解析、重复定义告警、未定义引用告警（不崩溃）
- `logicalType`（如 `timestamp-millis`、`decimal`）：以注释形式标注，保留信息

## 限制（「粗略映射」的含义）

- **只解析 Schema，不做 Avro 二进制 / JSON 数据的编解码**（那需要完整的读写器与分辨率规则）
- JSON Schema 映射是近似的：Avro 的 `bytes`/`fixed` 只能映射成 `string`，`logicalType` 用 `$comment` 标注而非标准 format；
  命名类型采用内联展开（递归引用会截断并加注释），不输出 `$ref` / `$defs`
- 不做 schema resolution（读写器模式演进、别名、默认值兼容性判断）
- 嵌套上限 32 层；输入上限 200,000 字符，结构非法时抛 `AvroParseError`

## 数据流向

**纯本地处理。** 输入仅在浏览器内存中解析，不发送网络请求，不写入服务端。`meta.api = false`。

## 示例（输出节选）

```text
# Avro Schema 字段树
com.example.User (record)
├─ id: long
├─ name: string
├─ email: union（2 个分支）
│  ├─ null
│  └─ string
└─ tags: array<string>
   └─ string

类型统计：
  record: 1
  union: 1
  array: 1
  ...
```

## 元信息

| 项       | 值                        |
| -------- | ------------------------- |
| 全局编号 | #176                      |
| 域       | `data-format`（数据格式） |
| 大组     | `dev`                     |
| 优先级   | P3                        |
| 可行性   | A（纯 JS）                |
| 模板     | T2（双栏）                |
