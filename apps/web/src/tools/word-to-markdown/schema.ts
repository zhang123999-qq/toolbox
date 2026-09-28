import { z } from 'zod'

/** 输入契约：转换走左下文件入口，text 框仅作占位 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：本工具无选项（图片一律忽略，避免 Markdown 里出现超大 data URI） */
export const optionsSchema = z.object({})

export type WordToMarkdownInput = z.infer<typeof inputSchema>
export type WordToMarkdownOptions = z.infer<typeof optionsSchema>
