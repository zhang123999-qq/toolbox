import { z } from 'zod'

/** 输入契约：本工具无实质输入（text 仅占位） */
export const inputSchema = z.object({
  text: z.string().max(200, '输入内容过长'),
})

/** 选项契约：count=数量，gender=性别，language=语言 */
export const optionsSchema = z.object({
  count: z.string().max(10, '数量取值过长').optional(),
  gender: z.string().max(20, '性别取值过长').optional(),
  language: z.string().max(20, '语言取值过长').optional(),
})

export type RandomNameInput = z.infer<typeof inputSchema>
export type RandomNameOptions = z.infer<typeof optionsSchema>
