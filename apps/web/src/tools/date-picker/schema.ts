import { z } from 'zod'

/** 输入契约：日期选择器不使用输入框，仅作占位 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：本工具无额外选项 */
export const optionsSchema = z.object({})

export type DatePickerInput = z.infer<typeof inputSchema>
export type DatePickerOptions = z.infer<typeof optionsSchema>
