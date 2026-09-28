# robots.txt 生成 robots.txt Generator（#620）

按「User-agent 指令 路径」逐行填写规则，生成标准 robots.txt，
可附加 Sitemap URL 与 Crawl-delay。

## 使用方法

1. 左侧每行一条规则，格式：`User-agent 指令 路径`，例如：
   ```
   * disallow /private
   * allow /private/public
   Googlebot disallow /tmp
   ```
   空行与 `#` 开头注释会被忽略；同一 User-agent 的规则自动合并为一组；
2. 右侧可填 Sitemap URL 与 Crawl-delay（秒）；
3. 输出标准 robots.txt，可复制/下载。

## 错误处理

- 空规则、行格式不对、指令不是 allow/disallow、路径不以 `/` 开头，均显示中文错误（带行号）；
- Sitemap 非 http(s) URL、Crawl-delay 非整数均提示中文错误。

## English

Write one rule per line as `User-agent directive path` (e.g. `* disallow /private`)
to generate a standard robots.txt. Rules sharing a User-agent are grouped together.
Optional Sitemap URL and Crawl-delay (seconds) are appended at the end.
Blank lines and `#` comments are ignored; all validation errors are shown in Chinese.
