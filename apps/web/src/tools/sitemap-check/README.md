# 网站地图检查 Sitemap Check（#661）

粘贴 sitemap XML，校验是否符合 sitemap 协议规范。

## 使用方法

1. 左侧粘贴 sitemap XML 内容（支持 `urlset` 与 `sitemapindex`）；
2. 右侧实时显示通过率与问题列表，可复制/下载 Markdown 报告。

## 检查项

- XML 声明是否存在；
- 每个条目的 `<loc>` 必填且为 http(s) 绝对 URL；
- `<loc>` 不得重复；
- `<lastmod>` 日期格式（`YYYY-MM-DD` 或 ISO 8601）；
- `<changefreq>` 取值：always/hourly/daily/weekly/monthly/yearly/never；
- `<priority>` 为 0.0–1.0 的数字；
- 单文件条目数不超过 50000。

## English

Paste sitemap XML to validate it against the sitemap protocol:
required absolute `<loc>`, no duplicates, valid `<lastmod>` /
`<changefreq>` / `<priority>`, and at most 50,000 entries per file.
Both `urlset` and `sitemapindex` files are supported.
