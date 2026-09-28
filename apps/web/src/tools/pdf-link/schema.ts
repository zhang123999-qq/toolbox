import { z } from 'zod'

/**
 * 输入契约：text 为链接显示文字；url 为目标网址；page 为页码（从 1 开始）。
 * URL 与页码语义校验在 utils 里做（给出中文错误），schema 只做长度上限。
 */
export const inputSchema = z.object({
  text: z.string().max(500, '链接文字超过 500 字符上限'),
  url: z.string().max(2000, '链接超过 2000 字符上限'),
  page: z.string().max(20, '页码超过 20 字符上限'),
})

/** 本工具无选项 */
export const optionsSchema = z.object({})

export type PdfLinkInput = z.infer<typeof inputSchema>
export type PdfLinkOptions = z.infer<typeof optionsSchema>
