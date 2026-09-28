# 规范链接检查 Canonical Check（#663）

粘贴页面 HTML，检查 `<link rel="canonical">` 的设置是否规范。
与 #626 canonical（Canonical 标签生成）是"生成 vs 检查"的互补关系。

## 使用方法

1. 左侧粘贴页面 HTML；
2. 下方"页面 URL"填当前页面地址（可选，用于判断 canonical 是否自指）；
3. 右侧实时显示检查结果，可复制/下载 Markdown 报告。

## 检查项

- 缺失 canonical（警告）；
- 多个 canonical（错误，页面只应保留 1 个）；
- href 为空 / 非 http(s) 绝对 URL（错误）；
- canonical 与页面 URL 不一致（提示：分页/带参页面属正常，其他页面建议自指）。

## English

Paste page HTML to validate its `<link rel="canonical">`:
missing tags, duplicates, empty or non-absolute hrefs, and whether
the canonical is self-referencing for the given page URL.
