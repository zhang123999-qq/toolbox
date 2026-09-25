import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：三种 SHA-2 变体，输出 hex 或 Base64 */
export const optionsSchema = z.object({
  algorithm: z.union([z.literal('SHA-256'), z.literal('SHA-384'), z.literal('SHA-512')]),
  format: z.union([z.literal('hex'), z.literal('base64')]),
})

export type Sha256Input = z.infer<typeof inputSchema>
export type Sha256Options = z.infer<typeof optionsSchema>
