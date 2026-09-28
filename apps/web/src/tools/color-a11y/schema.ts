import { z } from 'zod'

/**
 * 输入契约：
 * - text：前景色（#rrggbb / 颜色名 / rgb()）
 * - bg：背景色
 */
export const inputSchema = z.object({
  text: z.string().max(200, '输入超过 200 字符上限'),
  bg: z.string().max(200, '输入超过 200 字符上限'),
})

export const optionsSchema = z.object({})

export type ColorA11yInput = z.infer<typeof inputSchema>
export type ColorA11yOptions = z.infer<typeof optionsSchema>
