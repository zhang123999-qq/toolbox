# Whois 查询

浏览器没有 whois 端口（TCP 43），本工具退而求其次：本地解析域名结构、给出 Whois 服务器速查，
并尽力通过 RDAP（HTTP）查询注册信息。

## 用途

想知道某个域名注册在谁手里、什么时候注册/过期。本工具在浏览器内能做的：

- 剥掉 `www.`、识别注册域名（正确处理 `example.com.cn` 这种二级后缀）
- 告诉你该 TLD 该去哪个 whois 服务器查、命令行怎么写
- 尝试访问 `https://rdap.org/domain/<域名>` 拿注册商与关键日期；跨域不通就回落本地信息，不卡死

## 输入

| 字段   | 类型   | 约束                    |
| ------ | ------ | ----------------------- |
| `text` | string | 域名，最大 200,000 字符 |

## 输出

```text
规范域名：example.com
注册域名：example.com
后缀（TLD）：com
标签：example . com
Whois 服务器：whois.verisign-grs.com
命令行查询：whois -h whois.verisign-grs.com example.com
RDAP 地址：https://rdap.org/domain/example.com

RDAP 注册信息：
  registrar: ...
  registration: 1995-08-14T05:00:00Z
  expiration: ...
```

## 浏览器边界说明

- **完整 whois 文本**（联系人邮箱、地址等）必须走 TCP 43，浏览器做不到；本工具只给 RDAP 能拿到的结构化字段
- RDAP 走 `rdap.org`，若被网络拦截，会显示「浏览器跨域请求失败」并给出命令行替代，不是错误

## 数据流向

**浏览器发起 fetch（C 类）。** RDAP 查询经 rdap.org，无 Key。`meta.api = false`。

## 元信息

| 项       | 值                       |
| -------- | ------------------------ |
| 全局编号 | #208                     |
| 域       | `devops`（开发 / 运维）  |
| 大组     | `dev`                    |
| 优先级   | P2                       |
| 可行性   | C（浏览器 fetch / RDAP） |
| 模板     | T2（双栏）               |
