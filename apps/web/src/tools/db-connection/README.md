# 数据库连接串

选数据库类型，填 host / port / user / password / dbname，拼出标准连接串 URL。

## 用途

连接数据库时不用记每种库的 URL scheme 和默认端口。

## 输入

| 字段   | 类型   | 约束                        |
| ------ | ------ | --------------------------- |
| `text` | string | 最大 200,000 字符（触发用） |

## 选项

| 选项 key   | 界面       | 说明                                          |
| ---------- | ---------- | --------------------------------------------- |
| `dbType`   | 数据库类型 | mysql / postgresql / mongodb / redis / sqlite |
| `host`     | Host       | 默认 localhost                                |
| `port`     | Port       | 留空用默认端口                                |
| `user`     | 用户       | 可空                                          |
| `password` | 密码       | 可空，特殊字符自动 URL 编码                   |
| `dbname`   | 库名       | sqlite 时为文件路径                           |

## 各库默认端口与示例

| 类型       | 示例                                          |
| ---------- | --------------------------------------------- |
| mysql      | `mysql://root:secret@localhost:3306/app`      |
| postgresql | `postgresql://root:secret@localhost:5432/app` |
| mongodb    | `mongodb://root:secret@localhost:27017/app`   |
| redis      | `redis://localhost:6379`                      |
| sqlite     | `sqlite:///tmp/app.db`                        |

## 安全提示

生成的连接串**含明文密码**，不要提交进 git、不要贴到公开渠道。本工具只在你浏览器本地拼接。

## 数据流向

**纯本地处理。** 无网络请求。`meta.api = false`。

## 元信息

| 项       | 值                      |
| -------- | ----------------------- |
| 全局编号 | #279                    |
| 域       | `devops`（开发 / 运维） |
| 大组     | `dev`                   |
| 优先级   | P1                      |
| 可行性   | A（纯 JS）              |
| 模板     | T2（双栏）              |
