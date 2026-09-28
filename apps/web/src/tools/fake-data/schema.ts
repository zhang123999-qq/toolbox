import { z } from 'zod'

/** 输入契约：text=字段类型列表（每行一个类型） */
export const inputSchema = z.object({
  text: z.string().max(20000, '字段类型列表过长'),
})

/** 选项契约：count=行数，language=语言，format=输出格式 */
export const optionsSchema = z.object({
  count: z.string().max(10, '数量取值过长').optional(),
  language: z.string().max(20, '语言取值过长').optional(),
  format: z.string().max(20, '格式取值过长').optional(),
})

export type FakeDataInput = z.infer<typeof inputSchema>
export type FakeDataOptions = z.infer<typeof optionsSchema>
