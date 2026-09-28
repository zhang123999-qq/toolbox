import { z } from 'zod'

/** 主输入：key=value 参数文本 */
export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20000 字符上限'),
})

export type CloudflareInput = z.infer<typeof inputSchema>

/** 选项：dns 生成 DNS 记录；page-rule 生成页面规则 */
export const optionsSchema = z.object({
  mode: z.enum(['dns', 'page-rule']),
})

export type CloudflareOptions = z.infer<typeof optionsSchema>
