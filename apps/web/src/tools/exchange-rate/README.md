# 汇率换算

输入金额并填写**你自备的 API Key**，实时查询汇率并换算。
D 类工具：汇率数据来自外部接口，本站不提供 Key。

## 用途

- 出境游 / 海淘 / 跨境收款时的货币换算
- 按实时汇率估算外币金额

## 输入

| 字段     | 类型   | 约束                               |
| -------- | ------ | ---------------------------------- |
| `text`   | string | 待换算金额（数字，≥0）             |
| `apiKey` | string | 你自备的汇率接口 Key（密码框填写） |

## 输出

```text
100 USD = 725.5 CNY
1 USD = 7.255 CNY
```

同币种（如 USD → USD）直接返回，不调用接口。

## 选项

| 选项   | 类型   | 取值                      |
| ------ | ------ | ------------------------- |
| `from` | select | 源货币（ISO 4217 代码）   |
| `to`   | select | 目标货币（ISO 4217 代码） |

## 边界

- 金额留空 → 输出空（不发请求）
- 未填 Key 就点运行 → 明确提示「请先填写 API Key」
- 非数字 / Infinity → 「金额无效」；负数 → 「金额不能为负数」
- 接口返回非 2xx（如 401）→ 提示检查 Key 是否有效
- 网络失败 → 提示检查网络后重试
- 接口业务失败（`success=false`）→ 透出接口返回的错误信息（截断 300 字符）

## 示例

输入：金额 `100`，源货币 USD，目标货币 CNY（需先填 Key）

输出：

```text
100 USD = 725.5 CNY
1 USD = 7.255 CNY
```

## 数据流向（D 类工具必读）

- 请求由**浏览器直接**发往 `https://api.exchangerate.host/convert`，**不经过**本项目任何服务器；
- API Key 只保存在当前页面的输入框中：不写 `localStorage`、不上传、不入库；
- 页面顶部有「需自备 API/Key」提示条（ToolShell 按 `meta.api` 自动展示）。

## API Key 获取

用户自备 Key：前往 exchangerate.host（汇率数据服务）注册并在控制台申请免费 access key，
将 Key 粘贴到本页「API Key」密码框即可。**不要把 Key 写进任何文件、不要分享给他人。**

## 环境变量登记

`.env.example` 中已登记 `TOOLBOX_EXCHANGE_RATE_API_KEY`
（满足 `pnpm check:env` 对 D 类工具“必须登记配置项”的要求，值保持为空）。

本工具**不读取任何环境变量**：API Key 只能在页面「API Key」密码框填写，
不写进任何文件、不经过本项目服务器。

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #364                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P2                                  |
| 可行性   | D（用户自备 API Key）               |
| 模板     | T2（双栏，异步运行）                |
| 依赖     | 无                                  |

## English

Exchange rate converter: enter an amount plus **your own API key** to convert with live rates.
Class-D tool: rate data comes from an external API; this site provides no key.

Inputs: `text` (amount, ≥ 0), `apiKey` (your key, typed into the password field).
Options `from`/`to`: ISO 4217 currency codes. Same-currency pairs return immediately without a request.

Data flow: the browser calls `https://api.exchangerate.host/convert` directly — no project server
involved. The key lives only in this page's input (never localStorage, never uploaded).

Get a key: sign up at exchangerate.host and create a free access key, then paste it into the
page's API Key field. Never hard-code it into any file or share it.
