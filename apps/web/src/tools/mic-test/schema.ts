import { z } from 'zod'

/**
 * 输入契约：麦克风测试为纯交互工具，无文本输入、无选项，
 * 全部交互（申请权限/电平显示）在输出面板内完成。
 */
export const inputSchema = z.object({
  text: z.string(),
})

export const optionsSchema = z.object({})

export type MicTestInput = z.infer<typeof inputSchema>
export type MicTestOptions = z.infer<typeof optionsSchema>
