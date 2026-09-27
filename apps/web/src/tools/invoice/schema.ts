import { z } from 'zod'

/** 输入契约：购销双方 + 发票号 + 日期 + 明细文本 + 备注 */
export const invoiceInputSchema = z.object({
  buyer: z.string().max(200, '购买方超过 200 字符上限'),
  seller: z.string().max(200, '销售方超过 200 字符上限'),
  invoiceNo: z.string().max(100, '发票号超过 100 字符上限'),
  date: z.string(),
  itemsText: z.string().max(200000, '明细超过 200,000 字符上限'),
  remark: z.string().max(1000, '备注超过 1000 字符上限'),
})

/** 选项契约：taxRate=税率（百分比数字字符串，如 '6'） */
export const invoiceOptionsSchema = z.object({
  taxRate: z.string(),
})

export type InvoiceInput = z.infer<typeof invoiceInputSchema>
export type InvoiceOptions = z.infer<typeof invoiceOptionsSchema>
