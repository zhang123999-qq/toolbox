import { z } from 'zod'

/** 输入契约：text 是待评估的口令 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：评估口径固定（zxcvbn 的默认模型），不提供可调项 */
export const optionsSchema = z.object({})

export type StrengthInput = z.infer<typeof inputSchema>
export type StrengthOptions = z.infer<typeof optionsSchema>
