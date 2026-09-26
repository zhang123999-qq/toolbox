# JSON Schema 校验

按 **JSON Schema** 校验数据，逐条列出不符合项及其路径。

## 用途

写完 Schema、改完接口，最怕的是「以为约束生效了其实没有」。粘数据 + 粘 Schema，
一眼看到哪条路径不符合什么约束。

## 输入

| 字段    | 类型   | 约束                          |
| ------- | ------ | ----------------------------- |
| `text`  | string | 待校验数据，≤ 1,000,000 字符  |
| `textB` | string | JSON Schema，≤ 1,000,000 字符 |

第一个输入框（`text`）是**待校验数据**，第二个输入框（`textB`）是 **Schema**。

## 输出

| 字段   | 类型   | 说明                                 |
| ------ | ------ | ------------------------------------ |
| `text` | string | 通过结论或问题清单；两侧都空返回空串 |

```
校验未通过（共 2 处）
  $：缺少必填字段 id
  $.age：大于 maximum 120，实际 200
```

## 选项

| 选项     | 取值             | 默认    | 说明                                       |
| -------- | ---------------- | ------- | ------------------------------------------ |
| `mode`   | `all` \| `first` | `all`   | 列出全部问题 / 只列第一条                  |
| `strict` | boolean          | `false` | 严格模式：遇到子集外关键字直接报错而非忽略 |

## 支持的关键字（子集）

| 关键字                    | 说明                                                 |
| ------------------------- | ---------------------------------------------------- |
| `type`                    | 单个或数组；`number` 接受整数，`integer` 不接受小数  |
| `required`                | 对象必填字段                                         |
| `enum`                    | 取值必须在列表内（标量恒等，对象按序列化比较）       |
| `minimum` / `maximum`     | 数值下限 / 上限                                      |
| `minLength` / `maxLength` | 字符串长度（按 Unicode 码点）                        |
| `pattern`                 | 字符串正则；正则本身非法时报错                       |
| `properties`              | 对象逐个成员递归                                     |
| `additionalProperties`    | `false` 拒绝额外字段，或给 Schema 继续校验           |
| `items`                   | 数组逐个元素递归（仅支持「一个 Schema 管全部元素」） |

## 限制

- **规划表原定依赖 `ajv`，本项目禁止新增 npm 依赖**，故改为自研关键字子集
- **不支持**（严格模式下会报错，非严格下忽略）：`$ref`、`$defs`、`allOf` / `anyOf` / `oneOf` / `not`、
  `patternProperties`、`propertyNames`、`uniqueItems`、`minItems` / `maxItems`、`prefixItems`（2020-12 的元组items）、
  `multipleOf`、`exclusiveMinimum` / `exclusiveMaximum`、`const`、`dependentRequired` 等
- **items 只支持「一个 Schema 管全部元素」**，即 draft-07 写法；2020-12 的 `prefixItems` 元组写法不做
- 报错最多收集 1,000 条；`enum` 比较对对象不区分键顺序
- 描述性关键字（`title` / `description` / `default` / `examples` / `$comment`）一律放行
- 输入上限 1,000,000 字符

## 数据流向

**纯本地处理。** 输入内容仅在浏览器内存中处理，不发送任何网络请求，不写入服务端。
`meta.api = false`，无需自备 API/Key。

## 示例

数据：

```json
{ "id": 1, "name": "工具库", "price": 8.95 }
```

Schema：

```json
{
  "type": "object",
  "required": ["id", "name"],
  "additionalProperties": false,
  "properties": {
    "id": { "type": "integer", "minimum": 1 },
    "name": { "type": "string", "minLength": 2 },
    "price": { "type": "number" }
  }
}
```

输出：

```
校验通过：符合 Schema 要求
```

## 元信息

| 项       | 值                        |
| -------- | ------------------------- |
| 全局编号 | #140                      |
| 域       | `data-format`（数据格式） |
| 大组     | `dev`                     |
| 优先级   | P1                        |
| 可行性   | A（纯 JS 自研子集）       |
| 模板     | T2（双栏）                |
