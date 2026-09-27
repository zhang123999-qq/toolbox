import { z } from 'zod'

/** 各字段字符上限（UI 以 invoice.itemsHint 等文案说明） */
export const ITEMS_MAX = 3000
export const SELLER_MAX = 80
export const BUYER_MAX = 80
export const NUMBER_MAX = 40
export const DATE_MAX = 20
export const TAX_RATE_MAX = 10
export const NOTES_MAX = 500

/**
 * 输入契约
 * - text：收费明细（主输入，多行，格式「名称,数量,单价」）
 * - 其余为附加字段
 */
export const inputSchema = z.object({
  text: z.string().max(ITEMS_MAX, '明细超过 3000 字符上限'),
  seller: z.string().max(SELLER_MAX, '销方超过 80 字符上限'),
  buyer: z.string().max(BUYER_MAX, '购方超过 80 字符上限'),
  number: z.string().max(NUMBER_MAX, '发票号超过 40 字符上限'),
  date: z.string().max(DATE_MAX, '日期超过 20 字符上限'),
  taxRate: z.string().max(TAX_RATE_MAX, '税率超过 10 字符上限'),
  notes: z.string().max(NOTES_MAX, '备注超过 500 字符上限'),
})

/** 选项契约：本工具无选项 */
export const optionsSchema = z.object({})

export type InvoiceInput = z.infer<typeof inputSchema>
export type InvoiceOptions = z.infer<typeof optionsSchema>
