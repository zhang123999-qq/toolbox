import { z } from 'zod'

/** 输入契约：输入框只作触发用 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：length/alphabet 均为字符串，合法性由 utils 校验 */
export const optionsSchema = z.object({
  length: z.string().max(10, '长度取值过长'),
  alphabet: z.string().max(200, '字母表过长'),
})

export type NanoidInput = z.infer<typeof inputSchema>
export type NanoidOptions = z.infer<typeof optionsSchema>
