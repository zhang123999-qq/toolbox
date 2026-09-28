import { z } from 'zod'

/** 输入契约：输入框只作触发用 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：length/charset/customCharset 为字符串，noAmbiguous 为布尔；合法性由 utils 校验 */
export const optionsSchema = z.object({
  length: z.string().max(10, '长度取值过长'),
  charset: z.string().max(20, '字符集取值过长'),
  noAmbiguous: z.boolean(),
  customCharset: z.string().max(200, '自定义字符集过长'),
})

export type ShortIdInput = z.infer<typeof inputSchema>
export type ShortIdOptions = z.infer<typeof optionsSchema>
