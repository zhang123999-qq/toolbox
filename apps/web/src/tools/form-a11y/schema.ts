import { z } from 'zod'

/** 输入契约：text=表单 HTML 片段 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({})

export type FormA11yInput = z.infer<typeof inputSchema>
export type FormA11yOptions = z.infer<typeof optionsSchema>
