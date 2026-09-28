import { z } from 'zod'

/** 输入契约：输入框只作触发用 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：count 为字符串数字，合法性由 utils 校验；其余为布尔开关 */
export const optionsSchema = z.object({
  count: z.string().max(10, '数量取值过长'),
  uppercase: z.boolean(),
  hyphens: z.boolean(),
})

export type UuidInput = z.infer<typeof inputSchema>
export type UuidOptions = z.infer<typeof optionsSchema>
