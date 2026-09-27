import { z } from 'zod'

/** 输入契约：text=待转换的整数 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：from=源进制，to=目标进制 */
export const optionsSchema = z.object({
  from: z.string().default('10'),
  to: z.string().default('16'),
})

export type BaseConvertInput = z.infer<typeof inputSchema>
export type BaseConvertOptions = z.infer<typeof optionsSchema>
