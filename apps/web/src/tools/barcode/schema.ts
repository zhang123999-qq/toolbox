import { z } from 'zod'

/** 输入契约：text=要编码的 ASCII 可打印字符 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入过长'),
})

/** 选项契约：height / lineWidth 合法性在 utils 校验；showText 为布尔开关 */
export const optionsSchema = z.object({
  height: z.string().max(10, '高度过长'),
  lineWidth: z.string().max(10, '线宽过长'),
  showText: z.boolean(),
})

export type BarcodeInput = z.infer<typeof inputSchema>
export type BarcodeOptions = z.infer<typeof optionsSchema>
