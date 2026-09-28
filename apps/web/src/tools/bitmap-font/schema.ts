import { z } from 'zod'

/** 主输入：要渲染为位图的文本 */
export const inputSchema = z.object({
  text: z.string().max(5000, '输入超过 5000 字符上限'),
})

export type BitmapFontToolInput = z.infer<typeof inputSchema>
