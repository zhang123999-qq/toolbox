import { z } from 'zod'

/** 输入契约：Postman Collection v2.1 JSON */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const LANGS = ['fetch', 'python', 'curl'] as const

/** 选项契约：目标语言 */
export const optionsSchema = z.object({
  language: z.union([z.literal('fetch'), z.literal('python'), z.literal('curl')]),
})

export type PostmanToCodeInput = z.infer<typeof inputSchema>
export type PostmanToCodeOptions = z.infer<typeof optionsSchema>
