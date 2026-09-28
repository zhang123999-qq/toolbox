# UTM 生成 UTM Builder（#618）

在基 URL 上拼接 UTM 参数，生成可追踪的推广链接。
`utm_source` / `utm_medium` / `utm_campaign` 必填，
`utm_term` / `utm_content` 可选。

## 使用方法

1. 左侧输入基 URL（必须以 http:// 或 https:// 开头）；
2. 右上角填写 UTM 参数；
3. 输出拼接好的完整 URL，可复制/下载。

基 URL 自带的参数会被保留，UTM 参数追加在后面；
参数值自动做百分号编码。

## 错误处理

- 基 URL 为空 / 非法 / 非 http(s) 显示中文错误；
- 必填参数为空逐个提示。

## English

Append UTM parameters to a base URL for campaign tracking.
`utm_source`, `utm_medium`, `utm_campaign` are required;
`utm_term`, `utm_content` are optional. Existing query parameters
are preserved; values are percent-encoded automatically.
