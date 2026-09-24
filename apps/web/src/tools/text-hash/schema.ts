import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(1000000, '输入超过 1,000,000 字符上限'),
})

/** 选项契约 */
export const optionsSchema = z.object({
  algorithm: z.union([
    z.literal('SHA-1'),
    z.literal('SHA-256'),
    z.literal('SHA-384'),
    z.literal('SHA-512'),
  ]),
  uppercase: z.boolean(),
})

export type TextHashInput = z.infer<typeof inputSchema>
export type TextHashOptions = z.infer<typeof optionsSchema>
