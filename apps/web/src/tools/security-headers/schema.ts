import { z } from 'zod'

/** 输入契约：原始 HTTP 响应头（curl -I / DevTools 复制），限长 */
export const inputSchema = z.object({
  text: z.string().max(200_000, '输入超过 200,000 字符上限'),
})

/** 纯规则分析，无可调选项 */
export const optionsSchema = z.object({})

export type SecurityHeadersInput = z.infer<typeof inputSchema>
export type SecurityHeadersOptions = z.infer<typeof optionsSchema>
