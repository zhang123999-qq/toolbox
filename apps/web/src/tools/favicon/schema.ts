import { z } from 'zod'

/**
 * 输入契约（#386 Favicon 生成）
 * - text：图标文本 / 首字母，留空随机
 * - 选项 size：边长（px），16–256，默认 64
 * - 选项 style：letter / gradient / geometric，默认 letter
 * - 选项 bgColor：背景色，留空随机
 * - 选项 fgColor：前景色，默认 #ffffff
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  size: z.string().max(10, '尺寸过长'),
  style: z.string().max(20, '样式过长'),
  bgColor: z.string().max(40, '背景色过长'),
  fgColor: z.string().max(40, '前景色过长'),
})

export type FaviconInput = z.infer<typeof inputSchema>
export type FaviconOptions = z.infer<typeof optionsSchema>
