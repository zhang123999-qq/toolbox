# Mock API

按字段定义生成 mock JSON 数据，并可选附带 Express / json-server 的启动片段，前端联调不用等后端。

## 用途

后端接口还没好时，前端需要一批假数据。本工具把 `name:type` 定义展开成 N 条确定性记录，
并给出一段能直接跑起来的 mock 服务代码。

## 输入

| 字段   | 类型   | 约束                                         |
| ------ | ------ | -------------------------------------------- |
| `text` | string | 字段定义，逗号或换行分隔，格式 `字段名:类型` |

## 支持的类型

| 类型                          | 生成值示例 |
| ----------------------------- | ---------- |
| `string` `name_1`             |
| `number` `0, 10, 20…`         |
| `boolean` `true / false` 交替 |
| `email` `user1@example.com`   |
| `date` `2026-01-01`           |
| `id` `1, 2, 3…`               |

## 选项

| 选项     | 说明                                                                              |
| -------- | --------------------------------------------------------------------------------- |
| 数量     | 生成 1 / 5 / 10 / 50 条                                                           |
| 输出形态 | `plain-json`（纯 JSON 数组）/ `express`（Express 服务）/ `json-server`（db.json） |

## 示例

输入：

```text
id:id, name:string, email:email, age:number, active:boolean
```

输出（plain-json，5 条）：

```json
[
  { "id": 1, "name": "name_1", "email": "user1@example.com", "age": 0, "active": true },
  { "id": 2, "name": "name_2", "email": "user2@example.com", "age": 10, "active": false },
  ...
]
```

选 `express` 会额外给出 `node server.js` 即可跑的接口；选 `json-server` 给出 `db.json`，
`npx json-server db.json` 即有 RESTful 接口。

## 限制

- 值是**确定性占位**（按序号生成），不是 faker 那种随机值；要随机可自己再加工
- 不支持嵌套对象 / 数组类型，只生成平铺记录
- 输入上限 200,000 字符

## 数据流向

**纯本地处理。** 不真起服务，只生成代码与数据。`meta.api = false`。

## 元信息

| 项       | 值                      |
| -------- | ----------------------- |
| 全局编号 | #214                    |
| 域       | `devops`（开发 / 运维） |
| 大组     | `dev`                   |
| 优先级   | P2                      |
| 可行性   | A（纯 JS）              |
| 模板     | T2（双栏）              |
