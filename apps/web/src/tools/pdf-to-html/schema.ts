import { z } from 'zod'

/** 输入契约：T3 模板要求 I extends { text: string }；本工具以文件为输入，text 仅占位 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：是否按字号识别标题；是否在页间插入分隔线 */
export const optionsSchema = z.object({
  detectHeadings: z.boolean(),
  pageBreaks: z.boolean(),
})

export type PdfToHtmlInput = z.infer<typeof inputSchema>
export type PdfToHtmlOptions = z.infer<typeof optionsSchema>
