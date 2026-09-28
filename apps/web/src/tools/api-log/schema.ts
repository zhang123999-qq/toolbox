import { z } from 'zod'

/** 主输入：访问日志文本 */
export const inputSchema = z.object({
  text: z.string().max(500000, '输入超过 500000 字符上限'),
})

export type ApiLogInput = z.infer<typeof inputSchema>
