import { z } from 'zod'

/** 输入契约：本工具无实质输入（text 仅占位），长度限制防滥用 */
export const inputSchema = z.object({
  text: z.string().max(200, '输入内容过长'),
})

/** 选项契约：count=数量（合法性在 utils 校验），format=输出格式 */
export const optionsSchema = z.object({
  count: z.string().max(10, '数量取值过长').optional(),
  format: z.string().max(20, '格式取值过长').optional(),
})

export type RandomColorInput = z.infer<typeof inputSchema>
export type RandomColorOptions = z.infer<typeof optionsSchema>
