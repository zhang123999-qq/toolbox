import { z } from 'zod'

/**
 * 输入契约：text=待校验数据；expected=期望哈希 hex（选项）；algo=算法；format=数据格式。
 * 长度不符、hex 非法在 utils 层处理（长度不符判不匹配，非法抛中文错）。
 */
export const inputSchema = z.object({
  text: z.string().max(500000, '输入超过 500,000 字符上限'),
})

export const optionsSchema = z.object({
  expected: z.string().max(500, '期望哈希过长'),
  algo: z.enum(['SHA-256', 'SHA-384', 'SHA-512', 'SHA-1']),
  format: z.enum(['text', 'hex']),
})

export type HashVerifyInput = z.infer<typeof inputSchema>
export type HashVerifyOptions = z.infer<typeof optionsSchema>
