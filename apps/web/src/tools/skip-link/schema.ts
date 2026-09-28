import { z } from 'zod'

/** 输入契约：text=待检测的 HTML（可空） */
export const inputSchema = z.object({
  text: z.string().max(200000, 'HTML 超过 200,000 字符上限'),
})

export const optionsSchema = z.object({})

export type SkipLinkInput = z.infer<typeof inputSchema>
export type SkipLinkOptions = z.infer<typeof optionsSchema>
