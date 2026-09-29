import { z } from 'zod'

/** 主输入：本工具为纯画布交互，文本输入保留为空（沿用 T3 模板结构） */
export const inputSchema = z.object({
  text: z.string().max(5000, '输入超过 5000 字符上限'),
})

export type DrawingBoardInput = z.infer<typeof inputSchema>
