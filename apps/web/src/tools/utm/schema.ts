import { z } from 'zod'

/** 输入契约：基 URL */
export const inputSchema = z.object({
  text: z.string().max(2000, '输入超过 2,000 字符上限'),
})

/** 选项契约：5 个 UTM 参数均为文本框输入的字符串 */
export const optionsSchema = z.object({
  source: z.string(),
  medium: z.string(),
  campaign: z.string(),
  term: z.string(),
  content: z.string(),
})

export type UtmInput = z.infer<typeof inputSchema>
export type UtmOptions = z.infer<typeof optionsSchema>
