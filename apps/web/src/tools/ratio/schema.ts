import { z } from 'zod'

/** 输入契约：text=比例（如 12:18），textB=第二个值（总数 / 已知项）；mode=计算模式 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  textB: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：simplify=化简，solve=解比例方程，split=按比例分配 */
export const optionsSchema = z.object({
  mode: z.enum(['simplify', 'solve', 'split']).default('simplify'),
})

export type RatioInput = z.infer<typeof inputSchema>
export type RatioOptions = z.infer<typeof optionsSchema>
