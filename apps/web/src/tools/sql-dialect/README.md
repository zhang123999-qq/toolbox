# SQL 方言转换

MySQL 与 PostgreSQL 之间常见语法差异互转。全程纯 TypeScript 自实现，不引入方言解析库。

## 用途

把建表语句或查询语句从一种方言改写到另一种：迁库、双写验证、把 MySQL 的 DDL 挪到 PostgreSQL
（或反过来）时省去手工替换关键字。

## 输入

| 字段   | 类型   | 约束              |
| ------ | ------ | ----------------- |
| `text` | string | 最大 200,000 字符 |

## 输出

| 字段   | 类型   | 说明                         |
| ------ | ------ | ---------------------------- |
| `text` | string | 转换后的 SQL；空输入返回空串 |

## 选项

| 选项     | 取值                          | 默认       | 说明                            |
| -------- | ----------------------------- | ---------- | ------------------------------- |
| `source` | `auto` / `mysql` / `postgres` | `auto`     | 原方言；`auto` 按特征词自动判定 |
| `target` | `mysql` / `postgres`          | `postgres` | 目标方言                        |

### auto 判定依据

| 特征                                                    | 计分给     |
| ------------------------------------------------------- | ---------- |
| 反引号标识符、`` ` ``                                   | MySQL      |
| `AUTO_INCREMENT` / `UNSIGNED` / `IFNULL` / `DATETIME`   | MySQL      |
| `LIMIT a, b` 逗号写法                                   | MySQL      |
| `::` 强转、`SERIAL` 系列、`RETURNING`、`ILIKE`、`JSONB` | PostgreSQL |

分高者胜；打成平手或没有特征时按 MySQL 处理（MySQL 专有写法更多）。

## 支持的转换

| 差异点          | MySQL → PostgreSQL                                                                     | PostgreSQL → MySQL                        |
| --------------- | -------------------------------------------------------------------------------------- | ----------------------------------------- |
| 自增主键        | `INT AUTO_INCREMENT` → `SERIAL`（`BIGINT` → `BIGSERIAL`）                              | `SERIAL` → `INT NOT NULL AUTO_INCREMENT`  |
| 标识符引用      | `` `col` `` → `"col"`                                                                  | `"col"` → `` `col` ``                     |
| 分页            | `LIMIT a, b` → `LIMIT b OFFSET a`                                                      | `LIMIT b OFFSET a` → `LIMIT a, b`         |
| 强转语法        | —                                                                                      | `x::type` → `CAST(x AS type)`             |
| 类型名          | `DATETIME`→`TIMESTAMP`、`TINYINT`→`SMALLINT`、`LONGTEXT`→`TEXT`、`MEDIUMINT`→`INTEGER` | `JSONB`→`JSON`、`TIMESTAMPTZ`→`TIMESTAMP` |
| 行数 / 空值函数 | `IFNULL(a,b)` → `COALESCE(a,b)`；`NOW()` 保持                                          | `NOW()` 保持                              |
| 列级修饰符      | 丢弃 `UNSIGNED`、`ON UPDATE CURRENT_TIMESTAMP`                                         | —                                         |
| 表选项          | 丢弃 `ENGINE=…`、`DEFAULT CHARSET=…`、`COLLATE=…`、`COMMENT=…`、`ROW_FORMAT=…` 等      | —                                         |
| 序列默认值      | —                                                                                      | 丢弃 `DEFAULT nextval(...)`               |
| 行注释符号      | `# 注释` → `-- 注释`                                                                   | 同上（两边都认 `--`）                     |

## 不支持（未做转换，输出保持原样）

- MySQL `INSERT IGNORE` / `ON DUPLICATE KEY UPDATE` / `REPLACE INTO` ↔
  PostgreSQL `ON CONFLICT DO NOTHING` / `DO UPDATE`
- PostgreSQL `RETURNING` 子句（MySQL 无对应能力）
- PostgreSQL `ILIKE` ↔ MySQL `LIKE`（字符集排序规则不同，语义不等价）
- `FETCH FIRST n ROWS ONLY`、`LIMIT ... OFFSET ... ROWS` 这类 SQL 标准分页写法
- 存储过程 / 触发器 / 视图体、`WINDOW`、CTE 递归、PARTITION BY 分区定义等复杂语法
- 时区行为、`SET` 会话语句、权限语句（`GRANT` / `REVOKE`）
- PostgreSQL 的自定义序列、`CHECK` 约束内的方言函数
- MySQL 分区表定义（`PARTITION BY ...`）会被当作表选项整段丢弃

## 限制

- 实现是「词法 + 规则改写」，不是完整解析器，不做语义等价校验，转换结果请复核后执行。
- 转换后统一按「子句换行 + 两级缩进」重排；`CREATE TABLE` 的列清单不做逐列换行。
- 括号必须配对、引号必须闭合，否则抛 `SqlDialectError`，消息里带「第 N 行第 M 列」。

## 异常

| 场景                  | 行为                                   |
| --------------------- | -------------------------------------- |
| 输入为空              | 返回空字符串                           |
| 输入超过 200,000 字符 | 抛 `SqlDialectError`                   |
| 括号不配对            | 抛 `SqlDialectError`，带行列的中文提示 |
| 字符串 / 引号未闭合   | 抛 `SqlDialectError`，带行列的中文提示 |
| 块注释未闭合          | 抛 `SqlDialectError`，带行列的中文提示 |

## 数据流向

**纯本地处理。** 输入内容仅在浏览器内存中处理，不发送任何网络请求，不写入服务端。
`meta.api = false`，无需自备 API/Key。

## 示例

MySQL 输入：

```sql
CREATE TABLE users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(64) NOT NULL,
  birth DATETIME NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SELECT `name`, IFNULL(birth, NOW()) FROM users WHERE id > 1 LIMIT 10, 5
```

PostgreSQL 输出：

```sql
-- 建表 + 查询：MySQL 方言
CREATE TABLE users (id SERIAL, "name" VARCHAR(64) NOT NULL, birth TIMESTAMP NULL, PRIMARY KEY (id));
SELECT "name", COALESCE(birth, NOW())
FROM users
WHERE id > 1
LIMIT 5
OFFSET 10
```

## 元信息

| 项       | 值                        |
| -------- | ------------------------- |
| 全局编号 | #167                      |
| 域       | `data-format`（数据格式） |
| 大组     | `dev`                     |
| 优先级   | P2                        |
| 可行性   | A（纯 JS）                |
| 模板     | T2（双栏）                |
