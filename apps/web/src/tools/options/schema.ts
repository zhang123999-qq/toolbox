import { z } from 'zod'

/** 主输入：Options 字段定义 JSON */
export const inputSchema = z.object({
  text: z.string().max(50000, '输入超过 50000 字符上限'),
})

export type OptionsToolInput = z.infer<typeof inputSchema>
