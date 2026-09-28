import { z } from 'zod'

/**
 * 输入契约：输入框只作触发用（生成器无需输入）。
 * 选项：count 为字符串数字（1–100，合法性由 utils 校验），prefix 控制 0x 前缀。
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  count: z.string().max(10, '数量取值过长'),
  prefix: z.boolean(),
})

export type PrivateKeyInput = z.infer<typeof inputSchema>
export type PrivateKeyOptions = z.infer<typeof optionsSchema>
