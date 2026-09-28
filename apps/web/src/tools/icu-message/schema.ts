import { z } from 'zod'

/**
 * 输入契约：
 * - text：ICU MessageFormat 消息，如 {n, plural, other{# 条}}
 * - values：变量取值的 JSON 对象，如 {"n": 3}
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  values: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({})

export type IcuMessageInput = z.infer<typeof inputSchema>
export type IcuMessageOptions = z.infer<typeof optionsSchema>
