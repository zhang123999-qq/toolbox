# JSON 转 TypeScript

由 JSON 样本生成 TypeScript 类型声明（`interface` 或 `type` 别名）。

## 用途

对接后端接口时，先拿一份真实响应贴进来，直接得到可用的 TS 类型，省去手抄字段的过程；
嵌套对象会自动拆成独立类型并以「父类型在后」的顺序声明，可直接复制进项目。

## 输入

| 字段   | 类型   | 约束                |
| ------ | ------ | ------------------- |
| `text` | string | 最大 2,000,000 字符 |

根节点必须是对象，或元素全为对象的非空数组（标量样本推不出类型声明）。

## 输出

| 字段   | 类型   | 说明                        |
| ------ | ------ | --------------------------- |
| `text` | string | TS 类型声明；空输入返回空串 |

## 选项

| 选项     | 取值                    | 默认        | 说明                                         |
| -------- | ----------------------- | ----------- | -------------------------------------------- |
| `type`   | interface / type        | `interface` | 生成接口还是类型别名                         |
| `mode`   | none / export / declare | `none`      | 是否给声明加 `export` / `declare` 前缀       |
| `style`  | mutable / readonly      | `mutable`   | 字段是否加 `readonly` 修饰                   |
| `strict` | boolean                 | `false`     | 严格模式：关闭时可空字段写作可选属性 `a?: T` |
| `indent` | 2 / 4 / tab             | `2`         | 一级缩进                                     |

## 限制

- **不依赖 npm `json-to-ts`**：全部逻辑为纯 TS 自研，方便离线与体积控制，行为以本文档为准
- 类型由样本推断：样本里没出现的可选 / 可空字段无法预知，只会按样本保守输出
- 同一数组内多条样本会合并字段，两侧缺失的键都标记为 `?: T | null`
- 数组元素中「对象与标量混排」这类无法用单一 TS 类型表达的场景，退化成 `unknown[]`
- 值为 `null` 的字段按 `null` 类型输出；非严格模式下写作 `a?: null`
- 数字不区分整数与浮点，统一 `number`；嵌套类型名由键名转 PascalCase 得到，
  键名无 ASCII 字母时回退为 `Nested`
- 输入上限 2,000,000 字符，超限抛 `JsonToTsError`

## 数据流向

**纯本地处理。** 输入内容仅在浏览器内存中处理，不发送任何网络请求，不写入服务端。
`meta.api = false`，无需自备 API/Key。

## 示例

输入：

```json
{ "id": 1, "name": "工具库", "tags": ["json", "ts"], "meta": { "stars": 870, "public": true }, "note": null }
```

输出：

```ts
interface Meta {
  stars: number
  public: boolean
}

interface Root {
  id: number
  name: string
  tags: string[]
  meta: Meta
  note?: null
}
```

## 元信息

| 项       | 值                        |
| -------- | ------------------------- |
| 全局编号 | #141                      |
| 域       | `data-format`（数据格式） |
| 大组     | `dev`                     |
| 优先级   | P0                        |
| 可行性   | A（纯 JS）                |
| 模板     | T2（双栏）                |
