import { z } from 'zod'

/** 输入契约：页面 URL（取 text 字段） */
export const inputSchema = z.object({
  text: z.string().max(2000, '页面 URL 超过 2000 字符上限'),
})

/** 选项契约：规范 URL */
export const optionsSchema = z.object({
  canonicalUrl: z.string().max(2000, '规范 URL 超过 2000 字符上限'),
})

export type CanonicalInput = z.infer<typeof inputSchema>
export type CanonicalOptions = z.infer<typeof optionsSchema>
