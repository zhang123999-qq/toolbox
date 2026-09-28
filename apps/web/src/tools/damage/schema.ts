import { z } from 'zod'

/** 主输入：伤害参数 JSON（各字段见 README） */
export const inputSchema = z.object({
  text: z.string().max(5000, '输入超过 5000 字符上限'),
})

export type DamageToolInput = z.infer<typeof inputSchema>
