import { z } from 'zod'

/** 输入契约：twitter:title（必填，取 text 字段） */
export const inputSchema = z.object({
  text: z.string().max(500, '标题超过 500 字符上限'),
})

/** 选项契约：卡片类型与其余字段 */
export const optionsSchema = z.object({
  card: z.string(),
  description: z.string(),
  image: z.string(),
  site: z.string(),
})

export type TwitterCardInput = z.infer<typeof inputSchema>
export type TwitterCardOptions = z.infer<typeof optionsSchema>
