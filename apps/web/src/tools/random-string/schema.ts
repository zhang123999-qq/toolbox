import { z } from 'zod'

/** 输入契约：输入框只作触发用，内容不参与生成 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：length/charset/customCharset 均为字符串，合法性由 utils 校验 */
export const optionsSchema = z.object({
  length: z.string().max(10, '长度取值过长'),
  charset: z.string().max(20, '字符集取值过长'),
  customCharset: z.string().max(200, '自定义字符集过长'),
})

export type RandomStringInput = z.infer<typeof inputSchema>
export type RandomStringOptions = z.infer<typeof optionsSchema>
