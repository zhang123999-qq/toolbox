import { z } from 'zod'

/**
 * 输入契约：震动测试为纯交互工具，无文本输入、无选项，
 * 全部交互（触发震动）在输出面板内完成。
 */
export const inputSchema = z.object({
  text: z.string(),
})

export const optionsSchema = z.object({})

export type VibrationInput = z.infer<typeof inputSchema>
export type VibrationOptions = z.infer<typeof optionsSchema>
