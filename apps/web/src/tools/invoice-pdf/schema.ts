import { z } from 'zod'

/**
 * 输入契约：text 为发票明细（每行"品名,数量,单价"），其余为发票字段。
 * 数字校验在 utils 里做（给出中文行号错误），schema 只做长度上限。
 */
export const inputSchema = z.object({
  text: z.string().max(100000, '输入超过 100,000 字符上限'),
  seller: z.string().max(200, '销方超过 200 字符上限'),
  buyer: z.string().max(200, '购方超过 200 字符上限'),
  number: z.string().max(100, '发票号超过 100 字符上限'),
  date: z.string().max(100, '日期超过 100 字符上限'),
  taxRate: z.string().max(20, '税率超过 20 字符上限'),
  notes: z.string().max(2000, '备注超过 2000 字符上限'),
})

/** 本工具无选项 */
export const optionsSchema = z.object({})

export type InvoiceInput = z.infer<typeof inputSchema>
export type InvoiceOptions = z.infer<typeof optionsSchema>
