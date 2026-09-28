import { z } from 'zod'

/**
 * 输入契约（#387 占位图生成）
 * - text：尺寸，如 300x200 或 300×200；留空默认 400x300
 * - 选项 bgColor：背景色，默认 #cccccc
 * - 选项 fgColor：文字颜色，默认 #666666
 * - 选项 customText：自定义文字，留空显示尺寸
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  bgColor: z.string().max(40, '背景色过长'),
  fgColor: z.string().max(40, '文字颜色过长'),
  customText: z.string().max(200, '自定义文字过长'),
})

export type PlaceholderInput = z.infer<typeof inputSchema>
export type PlaceholderOptions = z.infer<typeof optionsSchema>
