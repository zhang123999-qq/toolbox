import { z } from 'zod'

/** 主输入：变量赋值文本，如 "a=3 b=4" */
export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20000 字符上限'),
})

export type MathFormulaInput = z.infer<typeof inputSchema>

/** 选项：formula 选择公式 id */
export const optionsSchema = z.object({
  formula: z.string(),
})

export type MathFormulaOptions = z.infer<typeof optionsSchema>
