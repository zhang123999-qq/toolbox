import { z } from 'zod'

/**
 * 输入契约：text 为附件文本内容；filename 为附件文件名。
 * 语义校验在 utils 里做（给出中文错误），schema 只做长度上限。
 */
export const inputSchema = z.object({
  text: z.string().max(100000, '附件内容超过 100,000 字符上限'),
  filename: z.string().max(200, '文件名超过 200 字符上限'),
})

/** 本工具无选项 */
export const optionsSchema = z.object({})

export type PdfAttachInput = z.infer<typeof inputSchema>
export type PdfAttachOptions = z.infer<typeof optionsSchema>
