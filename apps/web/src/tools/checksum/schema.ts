import { z } from 'zod'

/** 输入契约：text 是待计算的内容（Luhn 只吃数字） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：算法 + 十六进制大小写 */
export const optionsSchema = z.object({
  algorithm: z.union([
    z.literal('sum8'),
    z.literal('sum16'),
    z.literal('sum32'),
    z.literal('xor8'),
    z.literal('mod256'),
    z.literal('luhn'),
  ]),
  uppercase: z.boolean(),
})

export type ChecksumInput = z.infer<typeof inputSchema>
export type ChecksumOptions = z.infer<typeof optionsSchema>
