# robots 检查 Robots Check（#662）

粘贴 robots.txt，解析分组规则并验证常见问题。
与 #620 robots（robots.txt 生成）是"生成 vs 检查"的互补关系。

## 使用方法

1. 左侧粘贴 robots.txt 内容；
2. 右侧实时显示分组表与问题列表，可复制/下载 Markdown 报告。

## 检查项

- 是否存在 User-agent 分组、User-agent 是否为空；
- `Disallow: /` 全站屏蔽且无 Allow 例外时给出危险警告；
- Allow 与 Disallow 对同一路径冲突；
- Crawl-delay 是否为合法数字；
- Sitemap 是否声明、是否为 http(s) 绝对 URL、是否重复。

## English

Paste robots.txt to parse its groups and validate common issues:
site-wide `Disallow: /` without exceptions, Allow/Disallow conflicts,
invalid Crawl-delay, and missing or malformed Sitemap declarations.
