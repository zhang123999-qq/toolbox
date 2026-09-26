# SQL 执行计划

粘贴一条 `SELECT`，**离线估算**它的执行计划：表扫描方式、JOIN 类型、排序与成本。

> 这是**基于规则的估算**，不是真实数据库的 `EXPLAIN`。不连库、不看真实统计信息，
> 结果只用于「这条 SQL 大概会怎么跑、哪里可能慢」的快速判断。

## 用途

写复杂查询时，提前看一眼：有没有全表扫描、JOIN 是不是 Nested Loop、ORDER BY 会不会额外排序。

## 输入

| 字段   | 类型   | 约束                          |
| ------ | ------ | ----------------------------- |
| `text` | string | SELECT 语句，最大 10,000 字符 |

## 输出

- 解析结果：主表 / JOIN 表 / WHERE 列 / ORDER BY / GROUP BY / LIMIT
- 估算步骤：Seq Scan vs Index Scan、Nested Loop Join、HashAggregate、Sort、Limit
- 相对成本（估算值）与索引建议

## 估算规则

| 特征     | 判定                              |
| -------- | --------------------------------- |
| 无 WHERE | Seq Scan（全表扫描，成本高）      |
| 有 WHERE | 假设命中索引 → Index Scan         |
| JOIN     | Nested Loop（假设 join 列有索引） |
| GROUP BY | HashAggregate                     |
| ORDER BY | Sort（无索引时额外开销）          |

## 限制

- 不解析子查询、CTE、窗口函数、复杂表达式
- 不知道真实表行数与索引存在与否，成本是相对值
- 只支持 SELECT

## 数据流向

**纯本地解析。** 无网络请求、不连库。`meta.api = false`。

## 元信息

| 项       | 值                      |
| -------- | ----------------------- |
| 全局编号 | #278                    |
| 域       | `devops`（开发 / 运维） |
| 大组     | `dev`                   |
| 优先级   | P2                      |
| 可行性   | A（纯 JS，规则估算）    |
| 模板     | T2（双栏）              |
