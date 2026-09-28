# PWA Manifest PWA Manifest Generator（#629）

左侧输入应用名称（name），右侧填写短名称、启动地址、显示模式、主题色、
背景色与图标列表，生成 `manifest.json` 文件内容，
保存为网站根目录的 `manifest.json` 并在页面 `<head>` 引用即可。

## 使用方法

1. 左侧输入 name（应用名称，必填）；
2. 右侧填写 short_name（短名称，必填）、start_url、display、
   theme_color / background_color（#hex 格式）；
3. icons 每行写「图标路径 尺寸」，如 `icon-192.png 192x192`，MIME 自动推断；
4. 输出 JSON，可复制/下载。

## 错误处理

- name / short_name 为空、颜色格式错误、图标行格式错误时显示中文错误（带行号）；
- 输出前做 JSON 回环校验，保证是合法 JSON。

## English

Enter the app name on the left and fill in short name, start URL, display mode,
theme colors and icons on the right to generate `manifest.json` content.
Chinese error messages with line numbers are shown for invalid input.
