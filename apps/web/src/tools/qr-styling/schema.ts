import { z } from 'zod'

/** 输入契约：text=二维码内容 */
export const inputSchema = z.object({
  text: z.string().max(2000, '输入超过 2,000 字符上限'),
})

/** 选项契约：合法性在 utils 层校验并抛中文错 */
export const optionsSchema = z.object({
  dotStyle: z.string().max(20, '点样式过长'),
  color: z.string().max(20, '颜色过长'),
  bgColor: z.string().max(20, '背景色过长'),
  margin: z.string().max(10, '边距过长'),
})

export type QrStylingInput = z.infer<typeof inputSchema>
export type QrStylingOptions = z.infer<typeof optionsSchema>
