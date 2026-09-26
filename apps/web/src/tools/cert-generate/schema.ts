import { z } from 'zod'

/** 输入契约：触发用 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const DAYS_OPTIONS = ['365', '3650', '36500'] as const
export const BITS_OPTIONS = ['2048', '4096'] as const

/** 选项契约：证书主题与有效期 */
export const optionsSchema = z.object({
  commonName: z.string(),
  organization: z.string(),
  organizationalUnit: z.string(),
  country: z.string(),
  days: z.union([z.literal('365'), z.literal('3650'), z.literal('36500')]),
  keySize: z.union([z.literal('2048'), z.literal('4096')]),
  altNames: z.string(),
})

export type CertGenerateInput = z.infer<typeof inputSchema>
export type CertGenerateOptions = z.infer<typeof optionsSchema>
