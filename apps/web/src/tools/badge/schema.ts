import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  label: z.string().max(40, '标签过长'),
  message: z.string().max(40, '信息过长'),
  color: z.string().max(20, '颜色过长'),
})

export type BadgeInput = z.infer<typeof inputSchema>
export type BadgeOptions = z.infer<typeof optionsSchema>
