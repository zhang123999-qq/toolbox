import { z } from 'zod'

/** 主输入：可选的片段 JSON（导入用） */
export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20000 字符上限'),
})

export type AnimationFrameToolInput = z.infer<typeof inputSchema>
