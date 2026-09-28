import { z } from 'zod'

export const MODES = ['粘贴分析', '实时抓取'] as const

/** 输入契约：粘贴分析模式下为 HTML；实时抓取模式下为页面 URL */
export const inputSchema = z.object({
  text: z.string().max(2000000, '输入超过 2,000,000 字符上限'),
})

/** 选项契约：分析模式 */
export const optionsSchema = z.object({
  mode: z.enum(MODES),
})

export type MobileFriendlyInput = z.infer<typeof inputSchema>
export type MobileFriendlyOptions = z.infer<typeof optionsSchema>
