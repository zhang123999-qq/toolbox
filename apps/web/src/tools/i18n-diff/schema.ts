import { z } from 'zod'

/**
 * 输入契约：
 * - text：基准语言 JSON（如英文）
 * - target：目标语言 JSON（如中文）
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  target: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({})

export type I18nDiffInput = z.infer<typeof inputSchema>
export type I18nDiffOptions = z.infer<typeof optionsSchema>
