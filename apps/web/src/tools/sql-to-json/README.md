# SQL 转 JSON Schema

把一条或多条 `CREATE TABLE` 建表语句转成一份 **JSON Schema（draft 2020-12）**：
每张表成为 `$defs` 下的一个对象定义，列映射为属性，类型、长度、可空、约束都带出来。
纯本地解析，复用「SQL 转 ORM」的建表词法解析，零新依赖。

## 用途

把数据库结构落成接口校验 / 文档基线：为 REST/GraphQL 响应建 JSON Schema、给前端 mock 定结构、
在 DDL 与契约之间做对照。

## 输入

| 字段   | 类型   | 约束                                       |
| ------ | ------ | ------------------------------------------ |
| `text` | string | 最大 200,000 字符；标准 `CREATE TABLE` DDL |

支持 MySQL / PostgreSQL / SQLite 常见写法：反引号 / 双引号 / 方括号标识符、
`IF NOT EXISTS`、`AUTO_INCREMENT`/`AUTOINCREMENT`、内联 `PRIMARY KEY` / `UNIQUE` / `DEFAULT`。

## 输出

一份 JSON Schema 文本：

```jsonc
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Database schema",
  "$defs": {
    "users": {
      "type": "object",
      "title": "users",
      "properties": {
        "id": { "type": "integer", "x-primary-key": true, "x-auto-increment": true },
        "email": { "type": "string", "maxLength": 255, "x-unique": true },
      },
      "required": ["id", "email"],
    },
  },
}
```

## 类型映射

| SQL 类型                                | JSON Schema                                              |
| --------------------------------------- | -------------------------------------------------------- |
| INT / BIGINT / SMALLINT / SERIAL …      | `{ "type": "integer" }`                                  |
| FLOAT / DOUBLE / DECIMAL(p,s) / NUMERIC | `{ "type": "number" }`（精度写 `x-precision`/`x-scale`） |
| BOOLEAN / BOOL                          | `{ "type": "boolean" }`                                  |
| DATE                                    | `{ "type": "string", "format": "date" }`                 |
| DATETIME / TIMESTAMP                    | `{ "type": "string", "format": "date-time" }`            |
| TIME / UUID                             | `string` + `format: time` / `uuid`                       |
| CHAR / VARCHAR(n) / TEXT                | `{ "type": "string" }`（VARCHAR 带 `maxLength`）         |
| JSON / JSONB                            | `{}`（任意类型，结构不固定）                             |
| BLOB / BYTEA / BINARY                   | `{ "type": "string", "contentEncoding": "base64" }`      |

## 约束映射

- `NOT NULL` → 列名进入 `required`
- `PRIMARY KEY` / `UNIQUE` / `AUTO_INCREMENT` → `x-primary-key` / `x-unique` / `x-auto-increment`
- `DEFAULT 字面量` → `default`（数字 / 布尔 / NULL / 字符串；`CURRENT_TIMESTAMP` 等函数表达式省略）

## 限制

- 只解析 `CREATE TABLE`；视图、存储过程、`ALTER`、索引语句忽略
- **不解析外键关系**（`FOREIGN KEY` 当作表级约束跳过），因此不生成 `$ref`；需要关系图请用 #185 ER 图
- 表级复合主键 / 复合唯一约束不会归并到单列；类型映射按方言通用规则，不针对特定数据库做精确语义
- 不连接数据库、不校验数据，输入上限 200,000 字符；识别不到建表语句时抛 `SqlToJsonError`

## 数据流向

**纯本地处理。** DDL 仅在浏览器内存中解析，不发送网络请求。`meta.api = false`。

## 元信息

| 项       | 值                        |
| -------- | ------------------------- |
| 全局编号 | #169                      |
| 域       | `data-format`（数据格式） |
| 大组     | `dev`                     |
| 优先级   | P2                        |
| 可行性   | A（纯 JS）                |
| 模板     | T2（双栏）                |
