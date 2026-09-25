import { z } from 'zod'

/** 输入契约：text 是明文 / 密文 / 待签数据，密钥与签名由附加输入框承载 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  publicKey: z.string(),
  privateKey: z.string(),
  signature: z.string(),
})

/** 选项契约：direction 决定动作，hash 决定 OAEP / RSASSA 的摘要，encoding 决定密文与签名的呈现 */
export const optionsSchema = z.object({
  direction: z.union([
    z.literal('sign'),
    z.literal('verify'),
    z.literal('encrypt'),
    z.literal('decrypt'),
  ]),
  hash: z.union([z.literal('SHA-256'), z.literal('SHA-384'), z.literal('SHA-512')]),
  encoding: z.union([z.literal('base64'), z.literal('hex')]),
})

export type RsaInput = z.infer<typeof inputSchema>
export type RsaOptions = z.infer<typeof optionsSchema>
