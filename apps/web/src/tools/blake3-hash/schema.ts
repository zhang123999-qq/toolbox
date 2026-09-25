import { z } from 'zod'

/** 输入契约：text 是待摘要的文本 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：BLAKE3 是 XOF，输出长度可选（字节） */
export const optionsSchema = z.object({
  length: z.union([z.literal('32'), z.literal('64')]),
  uppercase: z.boolean(),
})

export type Blake3Input = z.infer<typeof inputSchema>
export type Blake3Options = z.infer<typeof optionsSchema>
