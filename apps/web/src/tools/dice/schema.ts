import { z } from 'zod'

/**
 * 输入契约（#414 骰子）
 * - text：骰子个数（字符串，utils 内做数值校验；1–100）
 * - sides：骰子面数（字符串，utils 内做数值校验；2–100）
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  sides: z.string().max(100, '骰子面数过长'),
})

export const optionsSchema = z.object({})

export type DiceInput = z.infer<typeof inputSchema>
export type DiceOptions = z.infer<typeof optionsSchema>
