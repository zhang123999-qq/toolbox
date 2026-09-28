import { z } from 'zod'

export const MODES = ['实时检测', '粘贴分析'] as const

/** 输入契约：待检测 URL，或粘贴的原始 HTTP 响应文本 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：检测模式 */
export const optionsSchema = z.object({
  mode: z.enum(MODES),
})

export type RedirectCheckInput = z.infer<typeof inputSchema>
export type RedirectCheckOptions = z.infer<typeof optionsSchema>
