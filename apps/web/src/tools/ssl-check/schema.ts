import { z } from 'zod'

/** 输入契约：一张 PEM 编码的 X.509 证书（-----BEGIN CERTIFICATE-----） */
export const inputSchema = z.object({
  text: z.string().max(100_000, '证书超过 100,000 字符上限'),
})

/** 离线规则体检，无可调选项 */
export const optionsSchema = z.object({})

export type SslCheckInput = z.infer<typeof inputSchema>
export type SslCheckOptions = z.infer<typeof optionsSchema>
