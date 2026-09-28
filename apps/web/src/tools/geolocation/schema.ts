import { z } from 'zod'

/**
 * 输入契约：地理位置为纯交互工具，无文本输入、无选项，
 * 全部交互（定位）在输出面板内完成。
 */
export const inputSchema = z.object({
  text: z.string(),
})

export const optionsSchema = z.object({})

export type GeolocationInput = z.infer<typeof inputSchema>
export type GeolocationOptions = z.infer<typeof optionsSchema>
