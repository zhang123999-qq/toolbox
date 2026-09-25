import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：五种变体，输出 hex 或 Base64 */
export const optionsSchema = z.object({
  algorithm: z.union([
    z.literal('BLAKE2b-512'),
    z.literal('BLAKE2b-384'),
    z.literal('BLAKE2b-256'),
    z.literal('BLAKE2s-256'),
    z.literal('BLAKE2s-128'),
  ]),
  format: z.union([z.literal('hex'), z.literal('base64')]),
})

export type Blake2Input = z.infer<typeof inputSchema>
export type Blake2Options = z.infer<typeof optionsSchema>
