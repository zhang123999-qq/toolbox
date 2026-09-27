import { z } from 'zod'

/** 输入契约：text=分数表达式，如 1/2 + 1 1/3 * 2 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：decimals=小数形式保留位数 */
export const optionsSchema = z.object({
  decimals: z.enum(['2', '4', '6', '10', '16']).default('10'),
})

export type FractionInput = z.infer<typeof inputSchema>
export type FractionOptions = z.infer<typeof optionsSchema>
