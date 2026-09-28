# 图像生成 AI Image Generation（#602）

BYOK 模式：输入图像描述，调用兼容 OpenAI `images/generations`
接口的服务生成图片，支持展示与下载。

## 使用方法

1. 左侧输入图像描述（中文即可）；
2. 右侧配置接口地址、模型名、API Key，选择尺寸；
3. 点「生成图像」，结果展示在下方，可点「下载图片」保存 PNG。

## BYOK 说明

- API Key 只保存在内存中，刷新/关闭页面即清除，不写 localStorage；
- Key 只出现在请求头中，本站不经手、不记录；
- 接口需兼容 OpenAI 的 `POST {baseURL}/images/generations` 格式，
  返回 `data[0].url` 或 `data[0].b64_json`；
- 生成可能较慢，超时时间为 120 秒。

## 错误处理

- 参数缺失（描述为空、Key 为空）显示中文错误；
- 401 / 403 / 404 / 429 / 5xx 翻译为中文提示。
