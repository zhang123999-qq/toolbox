import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：该工具无选项，占位以满足模板泛型约束 */
export const optionsSchema = z.object({})

export type HtmlToMarkdownInput = z.infer<typeof inputSchema>
export type HtmlToMarkdownOptions = z.infer<typeof optionsSchema>
