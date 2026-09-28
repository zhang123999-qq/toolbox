import { z } from 'zod'

/**
 * 输入契约：串口测试为纯交互工具，无文本输入、无选项，
 * 全部交互（请求/列出/打开/关闭串口）在输出面板内完成。
 */
export const inputSchema = z.object({
  text: z.string(),
})

export const optionsSchema = z.object({})

export type SerialTestInput = z.infer<typeof inputSchema>
export type SerialTestOptions = z.infer<typeof optionsSchema>
