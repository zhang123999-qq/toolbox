import { z } from 'zod'

/** 输入契约：text=二维码内容 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入过长'),
})

/** 选项契约：合法性在 utils 层校验并抛中文错 */
export const optionsSchema = z.object({
  level: z.string().max(10, '容错级别过长'),
  size: z.string().max(10, '尺寸过长'),
})

export type QrcodeInput = z.infer<typeof inputSchema>
export type QrcodeOptions = z.infer<typeof optionsSchema>
