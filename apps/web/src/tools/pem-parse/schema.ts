import { z } from 'zod'

/** 输入契约：text 是一整段 PEM（可带前后空行与说明文字） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：解析口径固定，没有可调项 */
export const optionsSchema = z.object({})

export type PemParseInput = z.infer<typeof inputSchema>
export type PemParseOptions = z.infer<typeof optionsSchema>
