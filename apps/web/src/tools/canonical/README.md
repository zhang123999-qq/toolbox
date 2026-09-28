# Canonical Canonical Tag Generator（#626）

左侧输入页面 URL，右侧填写规范 URL（去掉 utm 等跟踪参数后的唯一地址），
双 URL 校验合法后生成 `<link rel="canonical" href="…">` 标签代码，
粘贴到页面 `<head>` 即可告诉搜索引擎哪个是规范版本。

## 使用方法

1. 左侧输入页面 URL（必填，http(s) 绝对地址）；
2. 右侧填写规范 URL（必填，http(s) 绝对地址）；
3. 输出标签代码，可复制/下载。

## 错误处理

- 任一 URL 为空或不合法时显示中文错误；
- href 属性值中的 `& < > "` 自动做 HTML 转义。

## English

Enter the page URL on the left and the canonical URL on the right to generate
a `<link rel="canonical">` tag. Both URLs must be valid http(s) absolute URLs;
Chinese error messages are shown otherwise.
