import { z } from 'zod'

/** 主输入：calc 模式下为变量赋值（每行 symbol=value）；lookup 模式下可留空 */
export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20000 字符上限'),
})

export type PhysicsFormulaInput = z.infer<typeof inputSchema>

/** 选项：mode=lookup 公式速查；mode=calc 代入计算 */
export const optionsSchema = z.object({
  mode: z.enum(['lookup', 'calc']),
  formulaId: z.string(),
})

export type PhysicsFormulaOptions = z.infer<typeof optionsSchema>
