import { z } from 'zod'

/** 输入契约：网页 HTML + 页面 URL（用于判定是否为 https 页面） */
export const inputSchema = z.object({
  text: z.string().max(500000, '输入超过 500,000 字符上限'),
  pageUrl: z.string().max(2000, '页面 URL 过长'),
})

/** 无选项 */
export const optionsSchema = z.object({})

export type MixedContentInput = z.infer<typeof inputSchema>
export type MixedContentOptions = z.infer<typeof optionsSchema>
