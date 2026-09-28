import { z } from 'zod'

/** 输入契约：text=身高（cm），textB=体重（kg） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  textB: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：本工具无选项 */
export const optionsSchema = z.object({})

export type BmiInput = z.infer<typeof inputSchema>
export type BmiOptions = z.infer<typeof optionsSchema>
