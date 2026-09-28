import { z } from 'zod'

/** 主输入：函数表达式，如 x^2+2*x */
export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20000 字符上限'),
})

export type FunctionPlotInput = z.infer<typeof inputSchema>

/** 选项：min/max 区间，steps 采样点数（文本输入，解析为数字） */
export const optionsSchema = z.object({
  min: z.string(),
  max: z.string(),
  steps: z.string(),
})

export type FunctionPlotOptions = z.infer<typeof optionsSchema>
