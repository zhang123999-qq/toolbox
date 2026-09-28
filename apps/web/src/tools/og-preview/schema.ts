import { z } from 'zod'

/** 输入契约：抓取模式填 URL，粘贴模式填 HTML */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：fetch 抓取 URL；paste 粘贴 HTML */
export const optionsSchema = z.object({
  mode: z.union([z.literal('fetch'), z.literal('paste')]),
})

export type OgPreviewInput = z.infer<typeof inputSchema>
export type OgPreviewOptions = z.infer<typeof optionsSchema>
