import { z } from 'zod'

/** 输入契约：GraphQL 查询 / SDL 原文，限长 */
export const inputSchema = z.object({
  text: z.string().max(500_000, '输入超过 500,000 字符上限'),
})

/** 选项契约：indent 为每层缩进空格数 */
export const optionsSchema = z.object({
  indent: z.union([z.literal('2'), z.literal('4')]),
})

export type GraphqlFormatterInput = z.infer<typeof inputSchema>
export type GraphqlFormatterOptions = z.infer<typeof optionsSchema>
