import { z } from 'zod'

/** 输入契约：域名 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 无选项 */
export const optionsSchema = z.object({})

export type WhoisLookupInput = z.infer<typeof inputSchema>
export type WhoisLookupOptions = z.infer<typeof optionsSchema>
