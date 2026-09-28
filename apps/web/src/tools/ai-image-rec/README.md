# 图像识别 AI Image Recognition（#603）

BYOK 模式：上传一张图片，调用兼容 OpenAI `chat/completions`
多模态接口的模型，返回图片内容的识别描述。

## 使用方法

1. 选择一张图片（≤10MB，预览会显示在下方）；
2. 左侧输入想问的问题（留空则默认请模型描述图片内容）；
3. 右侧配置接口地址、多模态模型名、API Key；
4. 点「开始识别」，描述文本展示在下方。

## BYOK 说明

- API Key 只保存在内存中，刷新/关闭页面即清除，不写 localStorage；
- Key 只出现在请求头中，本站不经手、不记录；
- 图片在浏览器内转 dataURL 后直接发往用户自己的接口，本站不存储；
- 接口需兼容 OpenAI 的 `POST {baseURL}/chat/completions` 多模态格式
 （messages.content 为 text + image_url 数组）。

## 错误处理

- 非图片 / 超大图片 / 未选图片显示中文错误；
- 401 / 403 / 404 / 429 / 5xx 翻译为中文提示。
