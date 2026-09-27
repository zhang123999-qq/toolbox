import { z } from 'zod'

/** 输入契约：时间戳整数或日期串 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：本工具无选项（方向与单位全部自动识别） */
export const optionsSchema = z.object({})

export type TsConvertInput = z.infer<typeof inputSchema>
export type TsConvertOptions = z.infer<typeof optionsSchema>
