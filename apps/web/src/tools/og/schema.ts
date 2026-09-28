import { z } from 'zod'

/** 输入契约：og:title（必填，取 text 字段） */
export const inputSchema = z.object({
  text: z.string().max(500, '标题超过 500 字符上限'),
})

/** 选项契约：其余 OG 字段，均可选填 */
export const optionsSchema = z.object({
  description: z.string(),
  image: z.string(),
  url: z.string(),
  type: z.string(),
  siteName: z.string(),
})

export type OgInput = z.infer<typeof inputSchema>
export type OgOptions = z.infer<typeof optionsSchema>
