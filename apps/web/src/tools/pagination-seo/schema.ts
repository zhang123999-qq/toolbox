import { z } from 'zod'

export const MAX_INPUT = 200_000

/** 输入契约：页面 HTML；pageUrl 由附加输入框承载 */
export const inputSchema = z.object({
  text: z.string().max(MAX_INPUT, `输入超过 ${MAX_INPUT} 字符上限`),
  pageUrl: z.string(),
})

/** 无选项 */
export const optionsSchema = z.object({})

export type PaginationSeoInput = z.infer<typeof inputSchema>
export type PaginationSeoOptions = z.infer<typeof optionsSchema>
