import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(100_000, '输入超过 100KB 上限'),
})

export const optionsSchema = z.object({
  barColor: z.string().optional(),
})

export type BarChartInput = z.infer<typeof inputSchema>
export type BarChartOptions = z.infer<typeof optionsSchema>
