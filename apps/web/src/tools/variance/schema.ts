import { z } from 'zod'

/** 输入契约：text=数值列表（逗号 / 空格 / 换行分隔） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：sample=true 时按样本方差（分母 n−1）计算 */
export const optionsSchema = z.object({
  sample: z.boolean().default(false),
})

export type VarianceInput = z.infer<typeof inputSchema>
export type VarianceOptions = z.infer<typeof optionsSchema>
