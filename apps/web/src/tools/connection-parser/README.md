# 连接串解析

把 `mysql://` / `postgresql://` / `mongodb://` / `redis://` / `sqlite://` 形式的连接串
拆成 host / port / user / password / dbname / 参数表。

## 用途

拿到一条连接串，想快速看清它连的是哪台库、哪个库、带了哪些参数，不用肉眼对 `://` 和 `@`。

## 输入

| 字段   | 类型   | 约束                    |
| ------ | ------ | ----------------------- |
| `text` | string | 连接串，最大 5,000 字符 |

## 输出

- 类型（scheme）
- host / port / user / dbname
- password（**打码显示**，不回显明文）
- 查询参数表（`?sslmode=require&pool=10` 拆成 key = value）

## 安全

密码在输出区以 `******（已填写）` 形式打码，不会回显明文。解析全程在浏览器本地。

## 支持

| scheme     | 示例                                                  |
| ---------- | ----------------------------------------------------- |
| mysql      | `mysql://root:secret@localhost:3306/app`              |
| postgresql | `postgresql://user:pass@host:5432/db?sslmode=require` |
| mongodb    | `mongodb://user:pass@host:27017/db`                   |
| redis      | `redis://localhost:6379/0`                            |
| sqlite     | `sqlite:///tmp/app.db`                                |

## 数据流向

**纯本地解析。** 无网络请求、不连库。`meta.api = false`。

## 元信息

| 项       | 值                      |
| -------- | ----------------------- |
| 全局编号 | #280                    |
| 域       | `devops`（开发 / 运维） |
| 大组     | `dev`                   |
| 优先级   | P1                      |
| 可行性   | A（纯 JS）              |
| 模板     | T2（双栏）              |
