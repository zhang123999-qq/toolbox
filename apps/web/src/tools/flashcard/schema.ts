import { z } from 'zod'

/** 主输入：CSV 牌组，每行 "正面,背面" */
export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20000 字符上限'),
})

export type FlashcardInput = z.infer<typeof inputSchema>

/** 选项：study 学习；due 到期列表；stats 统计 */
export const optionsSchema = z.object({
  mode: z.enum(['study', 'due', 'stats']),
})

export type FlashcardOptions = z.infer<typeof optionsSchema>
