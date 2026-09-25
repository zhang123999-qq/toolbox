import { z } from 'zod'

/** 输入契约：text 是待签数据或原文，signature 仅验签时使用 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  privateKey: z.string(),
  publicKey: z.string(),
  signature: z.string(),
})

/** 选项契约：曲线与摘要必须与密钥、对端实现保持一致 */
export const optionsSchema = z.object({
  direction: z.union([z.literal('sign'), z.literal('verify')]),
  curve: z.union([z.literal('P-256'), z.literal('P-384'), z.literal('P-521')]),
  hash: z.union([z.literal('SHA-256'), z.literal('SHA-384'), z.literal('SHA-512')]),
  encoding: z.union([z.literal('base64'), z.literal('hex')]),
})

export type EcdsaInput = z.infer<typeof inputSchema>
export type EcdsaOptions = z.infer<typeof optionsSchema>
