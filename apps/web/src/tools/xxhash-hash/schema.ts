import { z } from 'zod'

/** 输入契约：text 是待哈希的文本 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：32 位或 64 位；xxHash 非加密，只用于校验与分桶 */
export const optionsSchema = z.object({
  bits: z.union([z.literal('32'), z.literal('64')]),
  uppercase: z.boolean(),
})

export type XxhashInput = z.infer<typeof inputSchema>
export type XxhashOptions = z.infer<typeof optionsSchema>
