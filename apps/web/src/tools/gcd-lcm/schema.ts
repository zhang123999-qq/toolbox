import { z } from 'zod'

/** 输入契约：text=整数 A，textB=整数 B（可空，缺省时与 A 相同） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  textB: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：本工具无选项 */
export const optionsSchema = z.object({})

export type GcdLcmInput = z.infer<typeof inputSchema>
export type GcdLcmOptions = z.infer<typeof optionsSchema>
