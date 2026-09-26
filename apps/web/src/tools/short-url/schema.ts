import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(2000, '输入超过 2,000 字符上限'),
})

export const optionsSchema = z.object({
  baseUrl: z.string().max(200, '基地址过长'),
})

export type ShortUrlInput = z.infer<typeof inputSchema>
export type ShortUrlOptions = z.infer<typeof optionsSchema>
