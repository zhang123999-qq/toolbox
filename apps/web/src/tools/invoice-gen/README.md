# 发票生成 · Invoice Generator

填写销方、购方与收费明细，自动计算小计、税额与总计，右侧实时预览排版，点击「导出 PNG」生成发票图片。
纯前端处理，不上传数据。

Enter seller, buyer and line items; subtotal, tax and total are computed automatically.
The layout previews live on the right; click "Export PNG" to download the invoice as an image.
All processing is local; nothing is uploaded.

## 用途 / Purpose

- 自由职业者 / 小团队快速开具形式发票（proforma invoice）
- 明细自动算税，避免手工计算错误

## 输入 / Inputs

| 字段               | 类型   | 约束                                                               |
| ------------------ | ------ | ------------------------------------------------------------------ |
| `text`（明细）     | string | 必填，多行；每行格式 `名称,数量,单价`（兼容全角逗号），≤ 3000 字符 |
| `seller`（销方）   | string | 可选，≤ 80 字符                                                    |
| `buyer`（购方）    | string | 可选，≤ 80 字符                                                    |
| `number`（发票号） | string | 可选，≤ 40 字符                                                    |
| `date`（日期）     | string | 可选，`YYYY-MM-DD`，≤ 20 字符                                      |
| `taxRate`（税率）  | string | 可选，0–100 的数字，可带 `%` 后缀，留空=0                          |
| `notes`（备注）    | string | 可选，≤ 500 字符                                                   |

## 输出 / Outputs

- 右侧预览：发票单据排版（表头、明细表、小计/税额/总计）
- 「导出 PNG」按钮：2x 倍率导出，文件名 `invoice-<发票号>.png`
- 复制 / 下载：发票的纯文本版本（`.txt`）

## 选项 / Options

无。

## 计算规则 / Calculation

- 行金额 = 数量 × 单价（四舍五入到分，修正浮点误差）
- 小计 = Σ 行金额；税额 = 小计 × 税率 ÷ 100；总计 = 小计 + 税额
- 金额显示：千分位 + 保留 2 位小数

## 限制 / Limits

- 数量须为正数，单价须为非负数（负数报错）
- 日期须为合法的 `YYYY-MM-DD`（含闰年校验）
- 不加载外部图片与外部字体，避免跨域导致导出失败
- 导出依赖浏览器 Canvas；失败时显示双语错误提示

## 数据流向 / Data flow

纯本地计算与渲染，不调用外部接口，不上传任何数据。

## 示例 / Example

输入明细：

```text
网站设计服务,1,8000
域名续费,2,100
服务器托管（年）,1,2400
```

税率 `6` → 小计 `10,600.00`、税额 `636.00`、总计 `11,236.00`

## 边界行为 / Edge cases

- 全部留空 → 空态提示，不报错
- 明细为空但填了其他字段 → 报错「请至少填写一项明细」
- 明细行格式不对 → 报错「第 N 行格式错误，应为「名称,数量,单价」」
- 数量/单价非数字、数量 ≤ 0、单价为负 → 对应报错
- 税率非数字或超出 0–100 → 报错
- HTML 特殊字符 → 预览中自动转义

## 元信息 / Meta

| 项    | 值                              |
| ----- | ------------------------------- |
| slug  | `invoice-gen`（全局编号 #406）  |
| 域/组 | random / design                 |
| 模板  | T3                              |
| 依赖  | html-to-image（导出时动态加载） |
