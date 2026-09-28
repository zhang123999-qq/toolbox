# JSON-LD JSON-LD Generator（#625）

选择结构化数据类型（Article / Product / FAQPage / BreadcrumbList / Organization），
按提示填写表单，生成可直接粘贴到页面 `<head>` 的
`<script type="application/ld+json">` 代码。

## 使用方法

1. 选择类型：文章选 Article、商品选 Product、问答页选 FAQPage、
   面包屑导航选 BreadcrumbList、公司/机构选 Organization；
2. 填写字段：标 `*` 为必填；
   - FAQPage 的问答列表每行写成「问题 || 答案」；
   - BreadcrumbList 的面包屑每行写成「名称 || URL」（URL 须为 http(s) 绝对地址）；
   - Organization 的 sameAs 每行一个社交主页 URL；
3. 点「生成」输出代码，可复制/下载。

## 错误处理

- 必填缺失、多行文本格式错误、URL 不合法时显示中文错误（多行文本带行号）；
- 输出前做 JSON 回环校验，保证是合法 JSON；
- 内容中的 `</script` 自动转义为 `<\/script`，防止标签被提前闭合。

## English

Pick a structured data type (Article / Product / FAQPage / BreadcrumbList /
Organization), fill in the form, and get a `<script type="application/ld+json">`
snippet ready to paste into your page `<head>`. Required fields are marked `*`;
multi-line fields use `||` as the separator and carry line numbers in Chinese
error messages.
