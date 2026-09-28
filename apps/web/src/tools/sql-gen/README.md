# SQL 生成 SQL Generator（#607）

BYOK 模式：用自然语言描述数据需求，请大模型生成对应 SQL 方言的语句，
支持 MySQL / PostgreSQL / SQLite / SQL Server / Oracle。

## 使用方法

1. 左侧输入自然语言需求（如"查出 2024 年注册、订单金额超过 1000 的用户"）；
2. 右上角选择 SQL 方言（默认 MySQL）；
3. 右侧配置接口地址、模型名、API Key；
4. 点「生成 SQL」，结果展示在下方，可复制/下载。

## 严格提取

提示词要求模型只返回 ```sql 代码块；本站从返回文本中严格提取代码块内容，
找不到代码块会报中文错，而不是把解释文字当 SQL 给你。

## BYOK 说明

- API Key 只保存在内存中，刷新/关闭页面即清除，不写 localStorage；
- Key 只出现在请求头中，本站不经手、不记录；
- 接口需兼容 OpenAI 的 `POST {baseURL}/chat/completions` 格式。

## 错误处理

- 需求为空 / 超长显示中文错误；
- 401 / 403 / 404 / 429 / 5xx 翻译为中文提示。
