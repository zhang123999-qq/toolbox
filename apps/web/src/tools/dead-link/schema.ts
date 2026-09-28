import { z } from 'zod'

export const MAX_INPUT = 200_000
/** URL 列表最多行数 */
export const MAX_URLS = 200

/** 输入契约：URL 列表（每行一个） */
export const inputSchema = z.object({
  text: z.string().max(MAX_INPUT, `输入超过 ${MAX_INPUT} 字符上限`),
})

/** 无选项 */
export const optionsSchema = z.object({})

export type DeadLinkInput = z.infer<typeof inputSchema>
export type DeadLinkOptions = z.infer<typeof optionsSchema>
