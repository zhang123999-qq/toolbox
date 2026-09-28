import { z } from 'zod'

/**
 * 输入契约：剪贴板测试为纯交互工具，无文本输入、无选项，
 * 全部交互（读写检测）在输出面板内完成。
 */
export const inputSchema = z.object({
  text: z.string(),
})

export const optionsSchema = z.object({})

export type ClipboardTestInput = z.infer<typeof inputSchema>
export type ClipboardTestOptions = z.infer<typeof optionsSchema>
