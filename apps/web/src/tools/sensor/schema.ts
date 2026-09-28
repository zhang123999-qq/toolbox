import { z } from 'zod'

/**
 * 输入契约：传感器为纯交互工具，无文本输入、无选项，
 * 全部交互（监听传感器）在输出面板内完成。
 */
export const inputSchema = z.object({
  text: z.string(),
})

export const optionsSchema = z.object({})

export type SensorInput = z.infer<typeof inputSchema>
export type SensorOptions = z.infer<typeof optionsSchema>
