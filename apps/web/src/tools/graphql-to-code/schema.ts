import { z } from 'zod'

/** 输入契约：一份 GraphQL 查询文档（可含多个操作） */
export const inputSchema = z.object({
  text: z.string().max(200_000, '输入超过 200,000 字符上限'),
})

/** 选项契约：mode 决定输出哪几段类型；strict 决定是否体现可空性 */
export const optionsSchema = z.object({
  mode: z.union([z.literal('both'), z.literal('variables'), z.literal('result')]),
  strict: z.boolean(),
})

export type GraphqlToCodeInput = z.infer<typeof inputSchema>
export type GraphqlToCodeOptions = z.infer<typeof optionsSchema>
