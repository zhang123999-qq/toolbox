import { z } from 'zod'

/** 输入契约：抓取模式下填页面 URL，粘贴模式下填 HTML 源码 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：实时抓取（fetch）/ 粘贴 HTML（paste） */
export const optionsSchema = z.object({
  mode: z.union([z.literal('fetch'), z.literal('paste')]),
})

export type SeoAuditInput = z.infer<typeof inputSchema>
export type SeoAuditOptions = z.infer<typeof optionsSchema>
