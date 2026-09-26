import { z } from 'zod'

/** 该工具以文件上传为主；text 仅满足 TwoColumn 输入契约，不承载数据库内容 */
export const inputSchema = z.object({
  text: z.string().max(10_000, '输入超过 10,000 字符上限').default(''),
})

/** 纯解析，无可调选项 */
export const optionsSchema = z.object({})

export type SqliteViewerInput = z.infer<typeof inputSchema>
export type SqliteViewerOptions = z.infer<typeof optionsSchema>
