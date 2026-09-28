# Open Graph Open Graph Generator（#623）

左侧输入 og:title，右侧填写描述 / 图片 / 链接 / 类型 / 站点名，
生成社交分享（微信 / 微博 / Facebook / X）用的 OG 标签代码。

## 使用方法

1. 左侧输入 og:title（必填，分享时的大标题）；
2. 右侧按需填写 og:description、og:image、og:url、og:site_name；
   og:type 默认 website，文章页可选 article；
3. 输出标签代码，空字段自动跳过，可复制/下载。

## 错误处理

- og:title 为空显示中文错误；
- 属性值中的 `& < > "` 自动做 HTML 转义。

## English

Enter og:title on the left and fill in description, image, URL, type and
site name on the right to generate Open Graph tags for social sharing.
Empty fields are skipped; og:title is required and og:type defaults to website.
