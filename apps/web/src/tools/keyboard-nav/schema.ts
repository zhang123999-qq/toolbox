import { z } from 'zod'

/** 输入契约：text=HTML 片段 */
export const inputSchema = z.object({
  text: z.string().max(200000, 'HTML 超过 200,000 字符上限'),
})

export const optionsSchema = z.object({})

export type KeyboardNavInput = z.infer<typeof inputSchema>
export type KeyboardNavOptions = z.infer<typeof optionsSchema>
