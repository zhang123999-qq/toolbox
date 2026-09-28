# ICU 消息预览

ICU MessageFormat 消息预览：手写解析器支持 text、argument、number/date/time、plural、selectordinal、select，嵌套分支、offset、=N 精确分支、`#` 替换都支持。代入变量实时渲染，并列出消息中全部占位变量。

## 用途

- 写 i18n 文案前先看复数规则渲染出来对不对
- 检查消息里用到了哪些变量，避免漏传
- 定位 ICU 语法错误（报错带字符位置）

## 输入

| 字段     | 类型   | 约束                                    |
| -------- | ------ | --------------------------------------- |
| `text`   | string | ICU 消息，如 `{n, plural, other{# 条}}` |
| `values` | string | 变量取值的 JSON 对象，如 `{"n": 3}`     |

## 说明

- 纯本地解析渲染，无网络请求。
- 缺失的变量保留 `{name}` 原样，不会崩。
- number/date/time 按 en-US 格式渲染；这是预览工具，不是完整 Intl 实现。
