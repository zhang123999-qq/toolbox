import { z } from 'zod'

/**
 * 输入契约（#415 硬币）
 * - text：抛掷次数（字符串，utils 内做数值校验；1–10000）
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({})

export type CoinInput = z.infer<typeof inputSchema>
export type CoinOptions = z.infer<typeof optionsSchema>
