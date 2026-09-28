import { z } from 'zod'

/**
 * 输入契约：键盘测试为纯交互工具，无文本输入、无选项，
 * 全部交互（按键按下/松开）在输出面板内完成。
 */
export const inputSchema = z.object({
  text: z.string(),
})

export const optionsSchema = z.object({})

export type KeyboardTestInput = z.infer<typeof inputSchema>
export type KeyboardTestOptions = z.infer<typeof optionsSchema>
