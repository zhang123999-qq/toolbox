# Meta 标签 Meta Tags Generator（#622）

左侧输入页面标题，右侧填写描述 / 关键词 / 作者 / 视口 / 字符集 / 主题色，
生成可直接粘贴到 `<head>` 的 HTML meta 标签代码。

## 使用方法

1. 左侧输入页面标题（必填，即 `<title>` 内容）；
2. 右侧按需填写各字段（viewport / charset 有常用默认值）；
3. 输出标签代码，空字段自动跳过，可复制/下载。

## 错误处理

- 标题为空显示中文错误；
- 属性值中的 `& < > "` 自动做 HTML 转义。

## English

Enter the page title on the left and fill in description, keywords, author,
viewport, charset and theme-color on the right to generate HTML meta tag code
ready to paste into `<head>`. Empty fields are skipped; the title is required.
