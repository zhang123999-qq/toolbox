# OG 预览

抓取或粘贴网页 HTML，提取 Open Graph / Twitter Card 标签，渲染 X / Facebook / LinkedIn
三种分享卡片预览，并给出缺失标签的补充建议。

## 用途

发文章、做活动页之前，先看看链接在社交平台分享出去大概长什么样：标题、描述、配图、
域名是否齐全。不用真的发出去，也不用去各平台的调试器排队。

## 输入

| 字段   | 类型   | 约束                                              |
| ------ | ------ | ------------------------------------------------- |
| `text` | string | 抓取模式填页面 URL，粘贴模式填页面 HTML，最大 200,000 字符 |

## 选项

| 选项 | 取值                                                |
| ---- | --------------------------------------------------- |
| 模式 | `fetch`（抓取 URL） / `paste`（粘贴 HTML） |

## 输出

文本摘要（每行一个标签，缺失标「（未设置）」），示例：

```text
og:title：示例 OG 标题：如何做好 SEO
og:description：示例 OG 描述：从零开始的完整指南，附实战清单。
og:image：https://example.com/cover.png
og:type：article
og:url：https://example.com/post
og:site_name：示例站点
twitter:card：summary_large_image
twitter:title：示例 Twitter 标题
twitter:description：示例 Twitter 描述
twitter:image：https://example.com/cover.png
```

下方同时渲染三张分享卡片（X 小图卡片、Facebook 大图卡片、LinkedIn 大图卡片）
与缺失项补充建议。

## og / twitter 标签对照表

| 标签                 | 含义                     | 缺失时的回退/建议                        |
| -------------------- | ------------------------ | ---------------------------------------- |
| `og:title`           | 分享标题                 | 回退 `<title>`；建议与正文标题一致       |
| `og:description`     | 分享摘要                 | 回退 `meta[name=description]`；建议 80–160 字 |
| `og:image`           | 分享大图                 | 无回退；建议 1200×630                    |
| `og:type`            | 页面类型（如 article）   | 可选                                     |
| `og:url`             | 规范链接                 | 用于卡片域名展示                         |
| `og:site_name`       | 站点名                   | 可选                                     |
| `twitter:card`       | X 卡片类型               | 建议 `summary_large_image`               |
| `twitter:title`      | X 专用标题               | 缺失时用 `og:title`                      |
| `twitter:description`| X 专用摘要               | 缺失时用 `og:description`                |
| `twitter:image`      | X 专用配图               | 缺失时用 `og:image`                      |

## 限制

- **抓取受 CORS 限制**：浏览器直接抓取目标页面，目标站若未开放 CORS 会失败；
  此时改用「粘贴 HTML」模式（在目标页右键「查看网页源代码」复制）。
- **预览为样式模拟**：三张卡片是纯 CSS 样式模拟，不是 X / Facebook / LinkedIn 的真实渲染，
  各平台实际展示可能有细微差异；上线前建议再用各平台官方调试器校验一次。
- 标签解析是正则提取，非常规 HTML（如标签跨行写属性）一般也能处理，
  但极端畸形的 markup 可能漏提。

## 数据流向

**浏览器发起 fetch（D 类）。** 抓取模式下浏览器直连目标页面，不经过本工具后端；
粘贴模式纯本地解析。`meta.api = false`（无 Key、无后端）。

## 元信息

| 项       | 值                       |
| -------- | ------------------------ |
| 全局编号 | #653                     |
| 域       | `seo`（网络 / SEO / 网站）|
| 大组     | `dev`                    |
| 优先级   | P2                       |
| 可行性   | D（浏览器 fetch 抓取）   |
| 模板     | T3（自定义 UI）          |
