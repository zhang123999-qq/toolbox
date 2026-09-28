import { z } from 'zod'

export const MAX_INPUT = 200_000
export const MODES = ['抓取页面', '粘贴HTML'] as const

/** 输入契约：页面 URL（抓取模式）或 HTML 源码（粘贴模式）+ 基准 URL */
export const inputSchema = z.object({
  text: z.string().max(MAX_INPUT, `输入超过 ${MAX_INPUT} 字符上限`),
  baseUrl: z.string().max(2000, '基准 URL 超过 2000 字符上限').default(''),
})

/** 选项契约：输入模式 */
export const optionsSchema = z.object({
  mode: z.enum(MODES),
})

export type LinkCheckInput = z.infer<typeof inputSchema>
export type LinkCheckOptions = z.infer<typeof optionsSchema>
