import { z } from 'zod'

/**
 * 输入契约（#384 头像生成）
 * - text：用户名 / 种子文本，留空则随机生成
 * - 选项 size：边长（px），32–512，默认 128
 * - 选项 style：initials / geometric / gradient，默认 initials
 * - 选项 bgColor：背景色（CSS 颜色），留空随机
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  size: z.string().max(10, '尺寸过长'),
  style: z.string().max(20, '样式过长'),
  bgColor: z.string().max(40, '颜色过长'),
})

export type AvatarInput = z.infer<typeof inputSchema>
export type AvatarOptions = z.infer<typeof optionsSchema>
