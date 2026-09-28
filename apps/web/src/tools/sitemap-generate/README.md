# Sitemap 生成 Sitemap Generator（#621）

左侧每行输入一个 URL，批量生成标准 XML sitemap（sitemaps.org 协议），
右侧可填 changefreq / priority / lastmod。

## 使用方法

1. 左侧粘贴 URL 列表（每行一个，必须 http(s) 开头）；
2. 右侧选填 changefreq（更新频率）、priority（0.0～1.0）、lastmod（YYYY-MM-DD）；
3. 输出标准 sitemap XML，可复制/下载后放到网站根目录。

## 错误处理

- 空列表、某行 URL 非法（带行号）、非 http(s) 协议，均显示中文错误；
- priority 越界、lastmod 格式/日期非法、changefreq 非法，均提示中文错误。

## English

Paste one URL per line to generate a standard XML sitemap (sitemaps.org protocol).
Optional changefreq, priority (0.0–1.0) and lastmod (YYYY-MM-DD) are included
per URL when provided. All validation errors are shown in Chinese with line numbers.
