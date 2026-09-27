import { z } from 'zod'

/** 各字段字符上限（UI 以文案说明） */
export const REASON_MAX = 500
export const PAYER_MAX = 40
export const PAYEE_MAX = 40
export const AMOUNT_MAX = 20
export const DATE_MAX = 20
export const NUMBER_MAX = 40
export const METHOD_MAX = 20

/**
 * 输入契约
 * - text：事由（主输入，多行）
 * - 其余为附加字段
 */
export const inputSchema = z.object({
  text: z.string().max(REASON_MAX, '事由超过 500 字符上限'),
  payer: z.string().max(PAYER_MAX, '付款人超过 40 字符上限'),
  payee: z.string().max(PAYEE_MAX, '收款人超过 40 字符上限'),
  amount: z.string().max(AMOUNT_MAX, '金额超过 20 字符上限'),
  date: z.string().max(DATE_MAX, '日期超过 20 字符上限'),
  number: z.string().max(NUMBER_MAX, '收据号超过 40 字符上限'),
})

/** 选项契约：支付方式（下拉选项，值为翻译后的展示文本） */
export const optionsSchema = z.object({
  method: z.string().max(METHOD_MAX, '支付方式超过 20 字符上限'),
})

export type ReceiptInput = z.infer<typeof inputSchema>
export type ReceiptOptions = z.infer<typeof optionsSchema>
