# 分页 SEO Pagination SEO（#664）

粘贴分页页面的 HTML，检查 `rel="prev"` / `rel="next"`、
canonical 自指与分页 URL 的一致性。

## 使用方法

1. 左侧粘贴页面 HTML；
2. 下方"页面 URL"填当前分页地址（可选，用于识别页码，支持 `?page=N` 与 `/page/N/`）；
3. 右侧实时显示检查结果，可复制/下载 Markdown 报告。

## 检查项

- 重复的 prev/next（错误）；
- 第一页出现 prev（警告）、缺 next（提示）；
- 非第一页缺 prev（警告）、缺 next（提示）；
- prev/next 未指向相邻页（警告）、href 为空（警告）或无法识别（提示）；
- 缺少 canonical（警告）、canonical 非自指（提示）。

## English

Paste paginated page HTML to check `rel="prev"` / `rel="next"`
presence and targets, canonical self-reference, and pagination URL
consistency. Page numbers are detected from `?page=N` or `/page/N/`.
