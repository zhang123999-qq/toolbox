import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：uppercase 只作用于 hex，format 选择 hex / Base64 */
export const optionsSchema = z.object({
  uppercase: z.boolean(),
  format: z.union([z.literal('hex'), z.literal('base64')]),
})

export type Sha1Input = z.infer<typeof inputSchema>
export type Sha1Options = z.infer<typeof optionsSchema>
