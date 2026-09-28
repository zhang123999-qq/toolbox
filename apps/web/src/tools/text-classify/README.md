# 文本分类 Text Classification（#614）

BYOK 模式：给定候选类别，请大模型把文本归入其中一类，
返回类别名与置信度。模型被要求只输出 JSON，本工具做严格解析。

## 使用方法

1. 左侧粘贴待分类文本（上限 5,000 字符）；
2. 上方填写候选类别，用逗号 / 顿号 / 换行分隔（去重保序）；
3. 右侧配置接口地址、模型名、API Key；
4. 点「开始分类」，下方展示类别与置信度。

## BYOK 说明

- API Key 只保存在内存中，刷新/关闭页面即清除，不写 localStorage；
- Key 只出现在请求头中，本站不经手、不记录；
- 接口需兼容 OpenAI 的 `POST {baseURL}/chat/completions` 格式；
- temperature 固定为 0，保证分类结果稳定。

## 错误处理

- 文本为空 / 超长、类别为空显示中文错误；
- 模型返回非 JSON / JSON 缺字段 / 置信度非法显示中文错误；
- 401 / 403 / 404 / 429 / 5xx 翻译为中文提示。

## English

BYOK text classification: provide candidate categories and your own API key;
the LLM returns JSON `{label, confidence}`, strictly parsed by this tool.
Key stays in memory only. OpenAI-compatible `chat/completions` endpoint required.
