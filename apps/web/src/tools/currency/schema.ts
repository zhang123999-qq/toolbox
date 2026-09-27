import { z } from 'zod'

/** 输入契约：text=待格式化的金额 */
export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20,000 字符上限'),
})

/**
 * 选项契约：
 * currency=货币代码（ISO 4217），locale=地区格式，
 * display=显示方式（symbol/code/name），decimals=小数位（auto=按币种默认）
 */
export const optionsSchema = z.object({
  currency: z.string(),
  locale: z.string(),
  display: z.string(),
  decimals: z.string(),
})

export type CurrencyInput = z.infer<typeof inputSchema>
export type CurrencyOptions = z.infer<typeof optionsSchema>
