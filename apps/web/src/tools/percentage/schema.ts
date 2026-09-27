import { z } from 'zod'

/** 输入契约：text=第一个数 A，textB=第二个数 B；mode=计算模式 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  textB: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：of=占比，value=求百分比的量，change=变化率 */
export const optionsSchema = z.object({
  mode: z.enum(['of', 'value', 'change']).default('of'),
})

export type PercentageInput = z.infer<typeof inputSchema>
export type PercentageOptions = z.infer<typeof optionsSchema>
