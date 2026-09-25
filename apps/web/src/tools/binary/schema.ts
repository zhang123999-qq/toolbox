import { z } from 'zod'

/** 输入契约：数值串通常比原文更短，上限仍按全站统一口径放到 200,000 字符 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/**
 * 选项契约：
 *  source / target 分别是输入与输出的进制（2 / 8 / 10 / 16，用字符串是因为 select 的取值就是字符串）；
 *  separator 只影响输出的**显示分组**（每 4 位 / 每 8 位），不改变数值本身。
 */
export const optionsSchema = z.object({
  source: z.union([z.literal('2'), z.literal('8'), z.literal('10'), z.literal('16')]),
  target: z.union([z.literal('2'), z.literal('8'), z.literal('10'), z.literal('16')]),
  separator: z.union([z.literal('none'), z.literal('4'), z.literal('8')]),
})

export type BinaryInput = z.infer<typeof inputSchema>
export type BinaryOptions = z.infer<typeof optionsSchema>
