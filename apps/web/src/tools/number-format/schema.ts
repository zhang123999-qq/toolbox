import { z } from 'zod'

/** 输入契约：text=待格式化的数字（每行一个） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：模式 / 千分位 / 小数位数 */
export const optionsSchema = z.object({
  mode: z.enum(['decimal', 'percent', 'scientific']).default('decimal'),
  grouping: z.boolean().default(true),
  decimals: z.enum(['0', '1', '2', '4', '6', '8']).default('2'),
})

export type NumberFormatInput = z.infer<typeof inputSchema>
export type NumberFormatOptions = z.infer<typeof optionsSchema>
