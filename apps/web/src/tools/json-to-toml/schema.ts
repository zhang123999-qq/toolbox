import { z } from 'zod'

/** 输入契约：JSON 对象原文，限长 */
export const inputSchema = z.object({
  text: z.string().max(2_000_000, '输入超过 2,000,000 字符上限'),
})

/** 选项契约：basic 用双引号（带转义）；literal 优先单引号，含特殊字符时回退双引号 */
export const optionsSchema = z.object({
  style: z.union([z.literal('basic'), z.literal('literal')]),
})

export type JsonToTomlInput = z.infer<typeof inputSchema>
export type JsonToTomlOptions = z.infer<typeof optionsSchema>
