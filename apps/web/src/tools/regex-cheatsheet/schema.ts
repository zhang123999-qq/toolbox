import { z } from 'zod'

/** 输入契约：text 仅作触发用 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：按分类过滤 */
export const optionsSchema = z.object({
  category: z.union([
    z.literal('all'),
    z.literal('web'),
    z.literal('identity'),
    z.literal('number'),
    z.literal('date'),
    z.literal('text'),
  ]),
})

export type RegexCheatsheetInput = z.infer<typeof inputSchema>
export type RegexCheatsheetOptions = z.infer<typeof optionsSchema>
