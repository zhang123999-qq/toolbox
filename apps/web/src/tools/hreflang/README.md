# hreflang hreflang Generator（#627）

为多语言网站生成 `<link rel="alternate" hreflang="…">` 标签组，
告诉搜索引擎每个语言版本对应的 URL。

## 使用方法

1. 每条填写语言代码（下拉选择 BCP47 格式，如 en、zh-CN）与对应 URL；
2. 点「添加一条」可继续加，「删除」可移除；
3. 点「生成」输出标签组，可复制/下载后粘贴到各语言页面 `<head>`。

## 错误处理

- 列表为空、语言代码格式错误、URL 为空或不合法时显示中文错误（带条目序号）；
- 属性值中的 `& < > "` 自动做 HTML 转义。

## English

Generate `<link rel="alternate" hreflang="…">` tags for multilingual sites.
Add language-region pairs (BCP47 code from the dropdown + URL), then copy or
download the tag group into each language page's `<head>`.
