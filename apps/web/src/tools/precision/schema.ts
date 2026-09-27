import { z } from 'zod'

/**
 * 输入契约
 * - text：第一个数
 * - textB：第二个数
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  textB: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：operator=运算符（+ − × ÷） */
export const optionsSchema = z.object({
  operator: z.enum(['+', '-', '×', '÷']).default('+'),
})

export type PrecisionInput = z.infer<typeof inputSchema>
export type PrecisionOptions = z.infer<typeof optionsSchema>
export type PrecisionOperator = PrecisionOptions['operator']
