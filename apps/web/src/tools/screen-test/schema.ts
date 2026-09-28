import { z } from 'zod'

/**
 * 输入契约：屏幕测试为纯交互工具，无文本输入、无选项，
 * 全部交互（测试图切换/全屏）在输出面板内完成。
 */
export const inputSchema = z.object({
  text: z.string(),
})

export const optionsSchema = z.object({})

export type ScreenTestInput = z.infer<typeof inputSchema>
export type ScreenTestOptions = z.infer<typeof optionsSchema>
