import { z } from 'zod'

/** 主输入：search 模式下为查询词；其余模式可留空 */
export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20000 字符上限'),
})

export type PeriodicTableInput = z.infer<typeof inputSchema>

/** 选项：mode=search 查询；mode=category 分类筛选 */
export const optionsSchema = z.object({
  mode: z.enum(['search', 'category']),
  category: z.string(),
})

export type PeriodicTableOptions = z.infer<typeof optionsSchema>
