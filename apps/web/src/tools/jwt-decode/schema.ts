import { z } from 'zod'

/** 输入契约：text 是一整串 JWT（compact 序列化） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：pretty 展开成可读 JSON，compact 压成一行 */
export const optionsSchema = z.object({
  format: z.union([z.literal('pretty'), z.literal('compact')]),
})

export type JwtDecodeInput = z.infer<typeof inputSchema>
export type JwtDecodeOptions = z.infer<typeof optionsSchema>
