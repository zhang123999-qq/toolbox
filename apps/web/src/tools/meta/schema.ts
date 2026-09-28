import { z } from 'zod'

/** 输入契约：页面标题（必填，取 text 字段） */
export const inputSchema = z.object({
  text: z.string().max(500, '标题超过 500 字符上限'),
})

/** 选项契约：其余 meta 字段，均可选填 */
export const optionsSchema = z.object({
  description: z.string(),
  keywords: z.string(),
  author: z.string(),
  viewport: z.string(),
  charset: z.string(),
  themeColor: z.string(),
})

export type MetaInput = z.infer<typeof inputSchema>
export type MetaOptions = z.infer<typeof optionsSchema>
