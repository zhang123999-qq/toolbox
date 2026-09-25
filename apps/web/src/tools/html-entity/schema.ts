import { z } from 'zod'

/** 输入契约 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：mode 决定编码时用命名实体还是全部用数字实体 */
export const optionsSchema = z.object({
  direction: z.union([z.literal('encode'), z.literal('decode')]),
  mode: z.union([z.literal('named'), z.literal('numeric')]),
})

export type HtmlEntityInput = z.infer<typeof inputSchema>
export type HtmlEntityOptions = z.infer<typeof optionsSchema>
