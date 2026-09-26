import { z } from 'zod'

export const LANGUAGES = ['fetch', 'node', 'python', 'java', 'go'] as const

/** 输入契约：一段 cURL 命令 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：目标语言 */
export const optionsSchema = z.object({
  language: z.union([
    z.literal('fetch'),
    z.literal('node'),
    z.literal('python'),
    z.literal('java'),
    z.literal('go'),
  ]),
})

export type CurlToCodeInput = z.infer<typeof inputSchema>
export type CurlToCodeOptions = z.infer<typeof optionsSchema>
