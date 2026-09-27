import { z } from 'zod'

/** 输入契约：text=出生日期，textB=参考日期（可空，默认今天） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  textB: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：本工具无选项 */
export const optionsSchema = z.object({})

export type AgeInput = z.infer<typeof inputSchema>
export type AgeOptions = z.infer<typeof optionsSchema>
