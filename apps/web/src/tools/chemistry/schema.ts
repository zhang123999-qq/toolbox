import { z } from 'zod'

/** 主输入：balance 模式为方程式；molar 模式为化学式；parse 模式为化学式 */
export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20000 字符上限'),
})

export type ChemistryInput = z.infer<typeof inputSchema>

/** 选项：balance 配平；molar 摩尔质量；parse 解析化学式 */
export const optionsSchema = z.object({
  mode: z.enum(['balance', 'molar', 'parse']),
})

export type ChemistryOptions = z.infer<typeof optionsSchema>
