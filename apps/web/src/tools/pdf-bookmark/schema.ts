import { z } from 'zod'

/**
 * 输入契约：text 为书签列表，每行"标题,页码"（英文逗号）。
 * 行语义校验在 utils 里做（给出中文行号错误），schema 只做长度上限。
 */
export const inputSchema = z.object({
  text: z.string().max(10000, '书签列表超过 10000 字符上限'),
})

/** 本工具无选项 */
export const optionsSchema = z.object({})

export type PdfBookmarkInput = z.infer<typeof inputSchema>
export type PdfBookmarkOptions = z.infer<typeof optionsSchema>
