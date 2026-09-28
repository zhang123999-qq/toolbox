import { z } from 'zod'

/** 主输入：掉落表 JSON（各字段见 README） */
export const inputSchema = z.object({
  text: z.string().max(10000, '输入超过 10000 字符上限'),
})

export type LootToolInput = z.infer<typeof inputSchema>
