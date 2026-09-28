import { z } from 'zod'

/** 主输入：{ rects: [{id,w,h}], maxWidth } JSON */
export const inputSchema = z.object({
  text: z.string().max(50000, '输入超过 50000 字符上限'),
})

export type TexturePackToolInput = z.infer<typeof inputSchema>
