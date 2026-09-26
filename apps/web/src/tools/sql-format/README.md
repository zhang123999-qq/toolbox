# SQL 格式化

关键字大小写归一、子句换行、缩进对齐，并保留注释。全程纯 TypeScript 自实现，不引入任何第三方 SQL 解析器。

## 用途

把挤在一行的 SQL 排版成可读形式：关键字大小写不统一、子句粘连、嵌套子查询看不清层级时用它整理。

## 输入

| 字段   | 类型   | 约束              |
| ------ | ------ | ----------------- |
| `text` | string | 最大 200,000 字符 |

## 输出

| 字段   | 类型   | 说明                           |
| ------ | ------ | ------------------------------ |
| `text` | string | 格式化后的 SQL；空输入返回空串 |

## 选项

| 选项     | 取值                       | 默认    | 说明                              |
| -------- | -------------------------- | ------- | --------------------------------- |
| `mode`   | `upper` / `lower` / `keep` | `upper` | 关键字大小写策略；`keep` 保持原样 |
| `indent` | `2` / `4` / `8`            | `2`     | 一级缩进的空格数                  |

## 处理规则

1. **换行**：`SELECT / FROM / WHERE / GROUP BY / HAVING / ORDER BY / LIMIT / OFFSET / VALUES / SET /
JOIN 系列 / UNION 系列 / ON / RETURNING` 等子句起点另起一行；`DELETE FROM`、`LEFT JOIN`
   这类固定搭配整体换行。
2. **缩进**：括号每深一层加一级缩进；子查询、窗口函数、`CREATE TABLE` 列清单均适用。
3. **列清单**：`CREATE TABLE` 的顶层括号里，每个逗号后的元素独占一行。
4. **空格**：逗号前、括号内紧贴处、`a.b` 限定名两侧不加空格；其余 token 之间补一个空格。
5. **注释**：`--` 行注释与 `/* */` 块注释原样保留，并独占一行。
6. **字符串**：`'a   b'` 这类字面量内部的空白不做任何改动。

## 限制

- 不是完整 SQL 解析器，只做到「词法 + 结构排版」层级，不做语义/方言校验。
- 关键字词典覆盖常见 DML / DDL 关键字、聚合函数与常用列类型；不在词典里的标识符
  （如自定义函数名）不会被改大小写，也不会触发换行。
- 与关键字同名的用户列（例如列名叫 `text`、`json`）在 `upper` / `lower` 模式下会被当作
  关键字改大小写，这是纯词法实现的固有取舍。
- SELECT 列表、AND / OR 条件不做逐项拆分，一条子句仍在同一行内。
- 不支持 MySQL 方言的 `#` 行内注释（会按普通符号处理），请改写为 `--`。
- 括号必须配对；不配对时抛 `SqlFormatError`，消息里带「第 N 行第 M 列」。

## 异常

| 场景                  | 行为                                  |
| --------------------- | ------------------------------------- |
| 输入为空              | 返回空字符串                          |
| 输入超过 200,000 字符 | 抛 `SqlFormatError`                   |
| 括号不配对            | 抛 `SqlFormatError`，带行列的中文提示 |
| 字符串 / 引号未闭合   | 抛 `SqlFormatError`，带行列的中文提示 |
| 块注释未闭合          | 抛 `SqlFormatError`，带行列的中文提示 |

## 数据流向

**纯本地处理。** 输入内容仅在浏览器内存中处理，不发送任何网络请求，不写入服务端。
`meta.api = false`，无需自备 API/Key。

## 示例

输入：

```sql
select u.id, u.name, count(*) as cnt from users u left join orders o on o.user_id = u.id where u.age > 18 order by cnt desc limit 10
```

输出（`mode=upper`、`indent=2`）：

```sql
SELECT u.id, u.name, COUNT(*) AS cnt
FROM users u
LEFT JOIN orders o
ON o.user_id = u.id
WHERE u.age > 18
ORDER BY cnt DESC
LIMIT 10
```

## 元信息

| 项       | 值                        |
| -------- | ------------------------- |
| 全局编号 | #165                      |
| 域       | `data-format`（数据格式） |
| 大组     | `dev`                     |
| 优先级   | P0                        |
| 可行性   | A（纯 JS）                |
| 模板     | T2（双栏）                |
