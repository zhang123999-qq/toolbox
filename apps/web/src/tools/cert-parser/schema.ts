import { z } from 'zod'

/** 输入契约：一张 PEM 证书 */
export const inputSchema = z.object({
  text: z.string().max(100_000, '证书超过 100,000 字符上限'),
})

/** 无选项 */
export const optionsSchema = z.object({})

export type CertParserInput = z.infer<typeof inputSchema>
export type CertParserOptions = z.infer<typeof optionsSchema>
