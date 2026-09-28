import { z } from 'zod'

export const SOURCES = ['网页 HTML', 'JSON-LD 文本'] as const

/** 输入契约：网页 HTML，或直接粘贴的 JSON-LD 文本 */
export const inputSchema = z.object({
  text: z.string().max(500000, '输入超过 500,000 字符上限'),
})

/** 选项契约：输入来源 */
export const optionsSchema = z.object({
  source: z.enum(SOURCES),
})

export type StructuredDataInput = z.infer<typeof inputSchema>
export type StructuredDataOptions = z.infer<typeof optionsSchema>
