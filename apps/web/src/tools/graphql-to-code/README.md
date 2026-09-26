# GraphQL 转代码

把 GraphQL 查询文档转成 TypeScript 类型：变量类型（`XxxQueryVariables`）与结果类型（`XxxQuery`）。

## 用途

手写 GraphQL 客户端代码时，变量与返回值的类型要跟着查询同步维护。本工具从查询文本直接生成一份可直接粘进项目的类型骨架，省掉手写接口。

## 输入

| 字段   | 类型   | 约束                            |
| ------ | ------ | ------------------------------- |
| `text` | string | 最大 200,000 字符，可含多个操作 |

## 输出

| 字段   | 类型   | 说明                                |
| ------ | ------ | ----------------------------------- |
| `text` | string | TypeScript 类型声明；空输入返回空串 |

## 选项

| 选项     | 取值                            | 默认   | 说明                                                                                                          |
| -------- | ------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| `mode`   | `both` / `variables` / `result` | `both` | 输出变量类型、结果类型，还是两者都输出                                                                        |
| `strict` | boolean                         | `true` | 严格模式：变量类型体现 GraphQL 可空性（`T \| null`），无默认值的非空变量必填；关闭时全部变量可选且不加 `null` |

## 限制

- **输入只有查询、没有 Schema**，因此叶子字段的具体标量无法判定，一律生成 `unknown`；是否列表、是否可空同样无法判定，需要按实际 Schema 补全
- 片段定义（`fragment X on Y {}`）与片段展开（`...Fragment`）**不支持**：片段定义整段跳过，片段展开忽略并在输出头部写入 `// 忽略片段展开 ...X` 告警
- 内联片段（`... on Type {}`）的字段会并入父对象，不会生成联合类型
- 不支持 SDL 类型定义（`type Foo {...}`）、`extend`、`schema` 等顶层定义，遇到会报「无法识别的顶层定义」
- 指令（`@include` / `@skip` 等）只跳过，不参与类型生成
- 输入上限 200,000 字符，超出抛出 `GraphqlToCodeError`

## 数据流向

**纯本地处理。** 输入内容仅在浏览器内存中处理，不发送任何网络请求，不写入服务端。
`meta.api = false`，无需自备 API/Key。

## 示例

输入：

```graphql
query GetUser($id: ID!, $first: Int = 10) {
  user(id: $id) {
    id
    name
    posts(first: $first) {
      title
    }
  }
}
```

输出（节选）：

```ts
// 由 graphql-to-code 生成（无 Schema：叶子字段类型推断为 unknown）
// 列表性与可空性无法仅凭查询判定，请按实际 Schema 补全

export interface GetUserQueryVariables {
  id: string
  first?: number
}

export interface GetUserQuery {
  user: {
    id: unknown
    name: unknown
    posts: {
      title: unknown
    }
  }
}
```

## 元信息

| 项       | 值                        |
| -------- | ------------------------- |
| 全局编号 | #172                      |
| 域       | `data-format`（数据格式） |
| 大组     | `dev`                     |
| 优先级   | P2                        |
| 可行性   | A（纯 JS）                |
| 模板     | T2（双栏）                |
