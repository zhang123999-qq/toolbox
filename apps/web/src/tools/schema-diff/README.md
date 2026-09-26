# Schema Diff

对比两份表结构定义（SQL DDL 或 JSON），列出新增、删除、类型与约束变更。

## 用途

发版前核对「预发库的 DDL」和「本地迁移脚本里的表结构」有没有漂；
把 ORM 导出的 JSON 结构与人手写的建表语句放在一起看差异；
Migration review 时把结果贴进 PR 描述（有用 Markdown 输出）。

## 输入

| 字段      | 类型   | 约束                     |
| --------- | ------ | ------------------------ |
| `text`    | string | 旧 Schema，≤100,000 字符 |
| `schemaB` | string | 新 Schema，≤100,000 字符 |

两种形态都收，**自动识别**（含 `CREATE TABLE` 判为 SQL，否则当 JSON）：

- **SQL DDL**：`CREATE TABLE`（允许 `IF NOT EXISTS`、反引号 / 双引号 / 方括号包裹的标识符、
  `--` 与 `/* */` 注释）
- **JSON**，支持以下几种写法：
  - `{"users": {"id": {"type": "bigint", "nullable": false, "primaryKey": true}}}`
  - `{"users": {"id": "bigint not null"}}`（值写成类型表达式）
  - `{"tables": {...}}` / `{"entities": {...}}` 之类外层壳会自动剥掉
  - `[{"name": "users", "columns": {...}}]` 数组形态
  - JSON Schema 形态 `{"title": "user", "properties": {...}, "required": [...]}`

## 输出

| 字段   | 类型   | 说明                          |
| ------ | ------ | ----------------------------- |
| `text` | string | diff 结果；两侧都空时返回空串 |

## 选项

| 选项         | 取值                           | 默认     | 说明                                     |
| ------------ | ------------------------------ | -------- | ---------------------------------------- |
| `format`     | `report` / `json` / `markdown` | `report` | 分段报告 / 机器可读 JSON / Markdown 表格 |
| `ignoreCase` | boolean                        | `true`   | 比较**类型**时忽略大小写                 |

### 参与对比的字段属性

`type`（类型）、`nullable`（可空）、`primaryKey`（主键）、`unique`（唯一）、
`autoIncrement`（自增）、`defaultValue`（默认值）。
两侧都未声明的属性不计为变更。`comment` 只解析不参与对比。

## 限制

- **SQL 解析是轻量实现**：按 `;` 切语句（字符串字面量里的 `;` 会被误切）、
  不解析表选项（`ENGINE=...`）、分区、生成列、外键指向的目标差异与索引细节；
  `ALTER TABLE` 也不在支持范围内。
- 表级 `PRIMARY KEY (a,b)` / `UNIQUE KEY ... (a)` 会回填到列上；
  表级 `CHECK` / `FOREIGN KEY` 只做识别，不进 diff。
- JSON 形态要求每个字段对象都带 `type`（或其同义键），否则报错指明是哪个字段。
- 两份内容必须同为 SQL 或同为 JSON，混着对比会报错中止。
- 不做「是否需要破坏性迁移」的判断：`varchar(100) → varchar(50)` 这种缩窄只会如实列出，
  不会提示风险。

## 数据流向

**纯本地处理。** 输入内容仅在浏览器内存中处理，不发送任何网络请求，不写入服务端。
`meta.api = false`，无需自备 API/Key。

## 示例

输入（旧）：

```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(100) NOT NULL UNIQUE,
  created_at DATETIME
);
```

输入（新）：

```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

输出（report）：

```text
== 汇总 ==
新增表 0 · 删除表 0 · 新增字段 0 · 删除字段 0 · 字段变更 3

== 字段变更 ==
~ users.email  类型: varchar(100) → varchar(255)
~ users.created_at  可空: （空） → false
~ users.created_at  默认值: （空） → CURRENT_TIMESTAMP
```

## 元信息

| 项       | 值                        |
| -------- | ------------------------- |
| 全局编号 | #186                      |
| 域       | `data-format`（数据格式） |
| 大组     | `dev`                     |
| 优先级   | P2                        |
| 可行性   | A（纯 JS）                |
| 模板     | T2（双栏，带附加输入框）  |
