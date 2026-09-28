import { z } from 'zod'

/** 主输入：切割参数 JSON（图片通过文件上传） */
export const inputSchema = z.object({
  text: z.string().max(50000, '输入超过 50000 字符上限'),
})

export type SpriteSplitToolInput = z.infer<typeof inputSchema>
