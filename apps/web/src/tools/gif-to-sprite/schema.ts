import { z } from 'zod'

/** 主输入：列数（文件通过上传控件读取） */
export const inputSchema = z.object({
  text: z.string().max(100, '输入超过 100 字符上限'),
})

export type GifToSpriteToolInput = z.infer<typeof inputSchema>
