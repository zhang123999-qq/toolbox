import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：三种 SHA-3 变体，输出 hex 或 Base64 */
export const optionsSchema = z.object({
  algorithm: z.union([z.literal('SHA3-256'), z.literal('SHA3-384'), z.literal('SHA3-512')]),
  format: z.union([z.literal('hex'), z.literal('base64')]),
})

export type Sha3Input = z.infer<typeof inputSchema>
export type Sha3Options = z.infer<typeof optionsSchema>
