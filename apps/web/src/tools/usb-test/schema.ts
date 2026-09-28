import { z } from 'zod'

/**
 * 输入契约：USB 测试为纯交互工具，无文本输入、无选项，
 * 全部交互（请求/列出设备）在输出面板内完成。
 */
export const inputSchema = z.object({
  text: z.string(),
})

export const optionsSchema = z.object({})

export type UsbTestInput = z.infer<typeof inputSchema>
export type UsbTestOptions = z.infer<typeof optionsSchema>
