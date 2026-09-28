# SEO 审计

在浏览器内对页面做 11 项 SEO 审计：title / meta description / canonical / Open Graph /
Twitter Card / hreflang / h1 / 图片 alt / viewport / JSON-LD / `<html lang>`，
给出 0–100 分与逐项「通过 / 警告 / 问题」结论。

## 用途

上线前快速检查页面 SEO 基本功：标题长度、描述、社交分享标签、移动端 viewport、
结构化数据等是否齐备。全部在浏览器内完成，不经过任何后端。

## 输入

| 字段   | 类型   | 约束                       |
| ------ | ------ | -------------------------- |
| `text` | string | 页面 URL（抓取模式）或 HTML 源码（粘贴模式），最大 200,000 字符 |

## 选项

| 选项 | 取值                      |
| ---- | ------------------------- |
| 模式 | `fetch`（实时抓取） / `paste`（粘贴 HTML） |

## 输出

```text
总分：68/100
[通过] title 标签：title 长度合适（13 个字符，去空白后计）
[问题] meta description：缺少 meta description
[警告] canonical 链接：缺少 canonical 链接
[通过] Open Graph 标签：og:title / og:description / og:image 齐全
[警告] Twitter Card：缺少 twitter:card
[警告] hreflang 链接：缺少 hreflang 链接（多语言站才需要，故为警告）
[通过] h1 标题：页面有且仅有 1 个 <h1>
[警告] 图片 alt：2 张图片中有 1 张缺少 alt（无 alt 或 alt 为空）
[通过] viewport meta：viewport meta 已设置
[警告] JSON-LD 结构化数据：缺少 application/ld+json 结构化数据
[通过] <html lang>：<html lang="zh-CN">
```

页面上同时展示总分与检查项表格（状态为 通过 / 警告 / 问题 文字徽标）；
「复制」复制上方纯文本报告，「下载」保存为 `seo-audit.txt`。

评分规则：通过 = 1 分，警告 = 0.5 分，问题 = 0 分，
`总分 = round(100 × (通过数 + 0.5 × 警告数) / 总项数)`。

## 限制

- **实时抓取受浏览器同源策略限制**：目标站若未开放 CORS，抓取会失败并提示改用
  「粘贴 HTML」模式——把浏览器「查看网页源代码」的内容完整粘贴进来即可审计。
- 抓取超时 15 秒；只接受 `content-type` 含 `html` 的响应。
- 审计用纯正则解析 HTML（不依赖 DOM），能处理属性单 / 双引号、无引号、
  属性顺序任意、标签大小写混写；但对严重畸形的 HTML 可能解析不准。
- 这是静态检查，不评价内容质量、关键词策略、外链与真实收录情况。

## 数据流向

**浏览器本地审计（D 类）。** 抓取模式由浏览器直接 fetch 目标页面（受 CORS 约束）；
审计逻辑纯前端正则，无后端调用。`meta.api = false`（无需 Key）。

## 元信息

| 项       | 值                  |
| -------- | ------------------- |
| 全局编号 | #649                |
| 域       | `seo`（网络 / SEO / 网站） |
| 大组     | `dev`               |
| 优先级   | P3                  |
| 可行性   | D（浏览器 fetch / 正则解析） |
| 模板     | T3（自定义 UI）     |
