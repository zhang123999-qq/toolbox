import { z } from 'zod'

/** 输入契约：text=数字或 CSV 数据（每行一个数据点） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：图表类型 / 小数位数 */
export const optionsSchema = z.object({
  chart: z.enum(['bar', 'line', 'pie']).default('bar'),
  decimals: z.enum(['0', '1', '2', '4', '6', '8']).default('2'),
})

export type StatisticsInput = z.infer<typeof inputSchema>
export type StatisticsOptions = z.infer<typeof optionsSchema>
