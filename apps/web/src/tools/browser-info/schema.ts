import { z } from 'zod'

/**
 * 输入契约：浏览器信息为纯交互工具，无文本输入、无选项，
 * 全部交互（检测）在输出面板内完成。
 */
export const inputSchema = z.object({
  text: z.string(),
})

export const optionsSchema = z.object({})

export type BrowserInfoInput = z.infer<typeof inputSchema>
export type BrowserInfoOptions = z.infer<typeof optionsSchema>
