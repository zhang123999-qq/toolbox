import { z } from 'zod'

/** 输入契约：时间戳数字、日期串或 ISO 串 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：本工具无选项 */
export const optionsSchema = z.object({})

export type IsoInput = z.infer<typeof inputSchema>
export type IsoOptions = z.infer<typeof optionsSchema>
