import { z } from 'zod'

/** 主输入：可选的画布尺寸/背景色文本 */
export const inputSchema = z.object({
  text: z.string().max(5000, '输入超过 5000 字符上限'),
})

export type PixelArtToolInput = z.infer<typeof inputSchema>
