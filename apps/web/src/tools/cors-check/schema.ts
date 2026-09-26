import { z } from 'zod'

/** 输入契约：原始 HTTP 响应头（curl -I / Devtools 复制），限长 */
export const inputSchema = z.object({
  text: z.string().max(200_000, '输入超过 200,000 字符上限'),
})

/** 本工具为纯规则分析，无可调选项；保留 options 以对齐 8 文件契约 */
export const optionsSchema = z.object({})

export type CorsCheckInput = z.infer<typeof inputSchema>
export type CorsCheckOptions = z.infer<typeof optionsSchema>
