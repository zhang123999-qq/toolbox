# SQL 转 ORM

把 `CREATE TABLE` 建表语句转成 **Sequelize** 或 **TypeORM** 的模型定义。
纯本地解析与生成，不依赖 SQL parser 与第三方 ORM。

## 用途

拿到数据库 DDL 后快速得到 Node.js 侧模型骨架：列类型映射、主键、自增、可空、唯一、
默认值等约束自动转成对应框架的写法，省去手工逐列抄写。

## 输入

| 字段   | 类型   | 约束                                             |
| ------ | ------ | ------------------------------------------------ |
| `text` | string | 最大 200,000 字符；包含一条或多条 `CREATE TABLE` |

支持反引号 / 双引号 / 方括号界定符、`IF NOT EXISTS`、列级与表级 `PRIMARY KEY`、
`--` 行注释与 `/* */` 块注释。表体用括号配平解析，`VARCHAR(100)`、`DECIMAL(10,2)` 不会截断。

## 输出

| 字段   | 类型   | 说明                                       |
| ------ | ------ | ------------------------------------------ |
| `text` | string | 模型源码；多张表用空行分隔；空输入返回空串 |

## 选项

| 选项     | 取值                | 默认        | 说明          |
| -------- | ------------------- | ----------- | ------------- |
| `target` | sequelize / typeorm | `sequelize` | 目标 ORM 框架 |

## 类型映射（摘要）

| SQL                        | Sequelize                              | TypeORM（TS 类型）           |
| -------------------------- | -------------------------------------- | ---------------------------- |
| INT / 各种 INT             | `DataTypes.INTEGER` 等                 | `int`（number）              |
| BIGINT                     | `DataTypes.BIGINT`                     | `bigint`（number）           |
| DECIMAL(10,2)              | `DataTypes.DECIMAL(10, 2)`             | `decimal`（number）          |
| VARCHAR(n)                 | `DataTypes.STRING(n)`                  | `varchar` + length（string） |
| TEXT 系列                  | `DataTypes.TEXT`                       | `text`（string）             |
| TINYINT/SMALLINT/MEDIUMINT | `DataTypes.TINYINT/SMALLINT/MEDIUMINT` | `int`（number）              |
| BOOLEAN / BOOL             | `DataTypes.BOOLEAN`                    | `boolean`（boolean）         |
| DATETIME/TIMESTAMP         | `DataTypes.DATE`                       | `datetime`（Date）           |
| JSON/JSONB                 | `DataTypes.JSON`                       | `json`（Record）             |

- 模型名：表名单数化后转 PascalCase（`user_posts → UserPost`）；TypeORM 属性名转 camelCase
- Sequelize 输出 `primaryKey / autoIncrement / allowNull / unique / default`，固定 `timestamps: false`
- TypeORM 自增主键用 `@PrimaryGeneratedColumn()`，其余主键用 `@PrimaryColumn`
- `DEFAULT CURRENT_TIMESTAMP` 在 Sequelize 中转成 `DataTypes.NOW`；其余默认值按原字面量保留

## 限制

- 面向**建表语句**：不解析 `ALTER`、索引、外键约束（`FOREIGN KEY` 被忽略，不生成关联关系）
- 是轻量词法解析而非完整 SQL 引擎；极端方言语法、复杂 `CHECK` 表达式、生成列可能识别不全
- 不生成迁移（migration）、关联（hasMany/belongsTo）与仓库（repository）代码
- 输入上限 200,000 字符；解析不到任何建表语句时抛 `SqlToOrmError`

## 数据流向

**纯本地处理。** 输入仅在浏览器内存中处理，不发送网络请求，不写入服务端，不连接数据库。`meta.api = false`。

## 示例

输入：

```sql
CREATE TABLE `users` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(255) UNIQUE
);
```

输出（Sequelize）：

```js
const User = sequelize.define(
  'users',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: true, unique: true },
  },
  { tableName: 'users', timestamps: false },
)
```

## 元信息

| 项       | 值                        |
| -------- | ------------------------- |
| 全局编号 | #168                      |
| 域       | `data-format`（数据格式） |
| 大组     | `dev`                     |
| 优先级   | P2                        |
| 可行性   | A（纯 JS）                |
| 模板     | T2（双栏）                |
