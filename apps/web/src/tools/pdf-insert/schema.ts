import { z } from 'zod'

/**
 * 输入契约：text 为要插入的文字；page 为页码（从 1 开始，字符串形式）。
 * 页码语义校验在 utils 里做（需结合 PDF 实际页数），schema 只做长度上限。
 */
export const inputSchema = z.object({
  text: z.string().max(1000, '插入文字超过 1000 字符上限'),
  page: z.string().max(20, '页码超过 20 字符上限'),
})

/** 本工具无选项 */
export const optionsSchema = z.object({})

export type PdfInsertInput = z.infer<typeof inputSchema>
export type PdfInsertOptions = z.infer<typeof optionsSchema>
