# Postman 转代码

解析 Postman Collection v2.1 JSON，把里面的每个请求列出来，并生成 fetch / Python / curl 代码。

## 用途

团队把接口存在 Postman 集合里，导出成 JSON 后，本工具帮你快速看清「这个集合有哪些请求、
各自什么方法/URL/头/body」，并直接换成目标语言的代码片段。

## 输入

| 字段   | 类型   | 约束                                            |
| ------ | ------ | ----------------------------------------------- |
| `text` | string | Postman Collection v2.1 JSON，最大 200,000 字符 |

支持一层文件夹嵌套（`item.item`）；URL 字段接受字符串或 `{raw}` 对象。

## 选项

| 选项     | 取值                        |
| -------- | --------------------------- |
| 目标语言 | `fetch` / `python` / `curl` |

## 输出

每个请求一段：

```text
### GET https://api.example.com/users?page=1
const res = await fetch('https://api.example.com/users?page=1', { method: 'GET',
  headers: {
    'Accept': 'application/json',
  },
})
console.log(res.status, await res.text())
```

## 限制

- 只取请求的方法 / URL / 头 / raw body，不处理 Postman 变量（`{{var}}` 不做替换）、鉴权预置脚本
- 不展开 `item` 里的两层以上文件夹、脚本、测试断言
- 输入上限 200,000 字符

## 数据流向

**纯本地处理。** 不发送网络请求。`meta.api = false`。

## 元信息

| 项       | 值                      |
| -------- | ----------------------- |
| 全局编号 | #212                    |
| 域       | `devops`（开发 / 运维） |
| 大组     | `dev`                   |
| 优先级   | P2                      |
| 可行性   | A（纯 JS）              |
| 模板     | T2（双栏）              |
