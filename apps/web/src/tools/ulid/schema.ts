import { z } from 'zod'

/** 输入契约：输入框只作触发用 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：count 为字符串数字，合法性由 utils 校验 */
export const optionsSchema = z.object({
  count: z.string().max(10, '数量取值过长'),
})

export type UlidInput = z.infer<typeof inputSchema>
export type UlidOptions = z.infer<typeof optionsSchema>
