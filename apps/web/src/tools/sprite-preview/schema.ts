import { z } from 'zod'

/** 主输入：帧 spriteId 列表（逗号/换行分隔） */
export const inputSchema = z.object({
  text: z.string().max(5000, '输入超过 5000 字符上限'),
})

export type SpritePreviewToolInput = z.infer<typeof inputSchema>
