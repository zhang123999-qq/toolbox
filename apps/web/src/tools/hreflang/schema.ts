import { z } from 'zod'

/**
 * 输入契约（#627 hreflang）
 * - entries：语言-地区对数组，JSON 字符串形式经 UI 组装后由 utils 校验
 */
export const inputSchema = z.object({
  text: z.string().max(100000, '输入超过 100,000 字符上限'),
})

export const optionsSchema = z.object({
  entries: z.string().max(100000, '条目数据过长'),
})

export type HreflangInput = z.infer<typeof inputSchema>
export type HreflangOptions = z.infer<typeof optionsSchema>
