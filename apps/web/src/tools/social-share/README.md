# 社交分享链接

输入一个 URL（可选标题与摘要），纯前端拼出 8 个平台的分享链接，
直接复制去发帖，不用登录、不发网络请求。

## 用途

写完文章想一键分享到 X / 微博 / 微信群（WhatsApp 链接）时，
不用去各平台查分享接口文档——这里一次生成 8 条，点「复制」即用。

## 各平台链接模板

| 平台     | 模板                                                          |
| -------- | ------------------------------------------------------------- |
| X        | `https://twitter.com/intent/tweet?url={u}&text={t}`           |
| Facebook | `https://www.facebook.com/sharer/sharer.php?u={u}`            |
| LinkedIn | `https://www.linkedin.com/sharing/share-offsite/?url={u}`     |
| 微博     | `https://service.weibo.com/share/share.php?url={u}&title={t}` |
| Telegram | `https://t.me/share/url?url={u}&text={t}`                     |
| WhatsApp | `https://wa.me/?text={t}`（t = `标题 URL` 整体编码一次）      |
| Reddit   | `https://www.reddit.com/submit?url={u}&title={t}`             |
| 邮件     | `mailto:?subject={t}&body={摘要\nURL}`                        |

`{u}` = URL 编码后的链接；`{t}` = URL 编码后的标题 / 摘要。
标题或摘要为空时，对应的可选参数会被省略（不留空 `text=`）。

参数取值规则：

- X / 微博 / Reddit 的文案取「分享标题」
- Telegram 的文案优先取「分享摘要」，无摘要时取标题
- WhatsApp 的文案是 `标题 + 空格 + URL` 整体编码，无标题时只有 URL
- 邮件主题取标题（为空省略），正文 = 摘要 + 换行 + URL（无摘要时只有 URL）

## 输入

| 字段   | 类型   | 约束                                                 |
| ------ | ------ | ---------------------------------------------------- |
| `text` | string | 要分享的 URL，必须 `http(s)` 开头，最大 200,000 字符 |

## 选项

| 选项     | 约束                    |
| -------- | ----------------------- |
| 分享标题 | 最多 200 字符，默认为空 |
| 分享摘要 | 最多 500 字符，默认为空 |

## 输出

```text
X：https://twitter.com/intent/tweet?url=https%3A%2F%2Fexample.com%2Farticle&text=...
Facebook：https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fexample.com%2Farticle
LinkedIn：https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fexample.com%2Farticle
微博：https://service.weibo.com/share/share.php?url=...&title=...
Telegram：https://t.me/share/url?url=...&text=...
WhatsApp：https://wa.me/?text=...
Reddit：https://www.reddit.com/submit?url=...&title=...
邮件：mailto:?subject=...&body=...
```

页面上每个平台还有独立的「复制」按钮；「复制全部」复制上面整段文本，
「下载 .txt」保存为 `social-share.txt`。

## 限制

- 只生成分享链接，不直接发布——点开链接后仍需在各平台手动确认发送
- 微信 / QQ 等国内平台没有公开的网页分享接口，不在范围内
- URL 必须带 `http://` 或 `https://`，裸域名会报错

## 数据流向

**纯本地计算（A 类）。** 链接拼接全部在浏览器里完成，不发任何网络请求，
`meta.api = false`。

## 元信息

| 项       | 值                         |
| -------- | -------------------------- |
| 全局编号 | #652                       |
| 域       | `seo`（网络 / SEO / 网站） |
| 大组     | `dev`                      |
| 优先级   | P1                         |
| 可行性   | A（纯 JS）                 |
| 模板     | T3（自定义 UI）            |
