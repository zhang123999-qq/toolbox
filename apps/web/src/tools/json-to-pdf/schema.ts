import { z } from 'zod'

/** 输入契约：text 为 JSON 文本 */
export const inputSchema = z.object({
  text: z.string().max(100000, '输入超过 100,000 字符上限'),
})

/** 选项契约：字号与页边距均为 pt 数值的字符串，传给 utils 时转 Number */
export const optionsSchema = z.object({
  fontSize: z.union([z.literal('9'), z.literal('10'), z.literal('12')]),
  margin: z.union([z.literal('36'), z.literal('54'), z.literal('72')]),
})

export type JsonToPdfInput = z.infer<typeof inputSchema>
export type JsonToPdfOptions = z.infer<typeof optionsSchema>
