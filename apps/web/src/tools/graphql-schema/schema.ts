import { z } from 'zod'

/** 输入契约：GraphQL SDL 原文，限长 */
export const inputSchema = z.object({
  text: z.string().max(500_000, '输入超过 500,000 字符上限'),
})

/** 纯解析汇总，无可调选项 */
export const optionsSchema = z.object({})

export type GraphqlSchemaInput = z.infer<typeof inputSchema>
export type GraphqlSchemaOptions = z.infer<typeof optionsSchema>
