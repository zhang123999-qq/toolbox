import { z } from 'zod'

/** 输入契约：text 未使用（参数在页面表单中），保留主输入框作备注 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({})

export type FocusStyleInput = z.infer<typeof inputSchema>
export type FocusStyleOptions = z.infer<typeof optionsSchema>
