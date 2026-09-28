import { z } from 'zod'

export const MAX_INPUT = 200_000

/** 输入契约：description 文本 + 可选的目标关键词 */
export const inputSchema = z.object({
  text: z.string().max(MAX_INPUT, `输入超过 ${MAX_INPUT} 字符上限`),
  keyword: z.string().max(200, '关键词超过 200 字符上限').default(''),
})

/** 无选项 */
export const optionsSchema = z.object({})

export type DescCheckInput = z.infer<typeof inputSchema>
export type DescCheckOptions = z.infer<typeof optionsSchema>
