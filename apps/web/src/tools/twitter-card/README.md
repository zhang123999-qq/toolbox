# Twitter Card Twitter Card Generator（#624）

左侧输入 twitter:title，右侧选择卡片类型并填写描述 / 图片 / 账号，
生成 X（Twitter）分享卡片用的标签代码。

## 使用方法

1. 左侧输入 twitter:title（必填，卡片大标题）；
2. 右侧选择 twitter:card 类型：summary（小图）或 summary_large_image（大图）；
3. 按需填写 twitter:description、twitter:image、twitter:site；
4. 输出标签代码，空字段自动跳过，可复制/下载。

## 错误处理

- twitter:title 为空显示中文错误；
- 属性值中的 `& < > "` 自动做 HTML 转义。

## English

Enter twitter:title on the left, pick a card type (summary or summary_large_image)
and fill in description, image and site on the right to generate Twitter Card tags.
Empty fields are skipped; twitter:title is required.
