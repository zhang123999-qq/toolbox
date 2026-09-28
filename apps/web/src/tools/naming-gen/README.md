# 命名生成 Naming Generator（#609）

BYOK 模式：用中文描述变量或函数的含义，请大模型按指定命名风格
（camelCase / snake_case / PascalCase / kebab-case）生成多个英文候选命名。

## 使用方法

1. 左侧输入中文描述（如"用户的姓名"）；
2. 右上角选择命名风格（默认 camelCase）；
3. 右侧配置接口地址、模型名、API Key；
4. 点「生成命名」，候选列表展示在下方，可复制/下载。

## 本地风格转换

`utils.ts` 中的 `toNamingStyle` 是纯函数，可把单词数组转成四种风格，
供本地校验与二次转换使用，不经过网络。

## BYOK 说明

- API Key 只保存在内存中，刷新/关闭页面即清除，不写 localStorage；
- Key 只出现在请求头中，本站不经手、不记录；
- 接口需兼容 OpenAI 的 `POST {baseURL}/chat/completions` 格式。

## 错误处理

- 描述为空 / 超长显示中文错误；
- 401 / 403 / 404 / 429 / 5xx 翻译为中文提示。
