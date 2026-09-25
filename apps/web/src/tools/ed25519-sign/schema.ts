import { z } from 'zod'

/** 输入契约：text 是待签数据或原文，signature 仅验签时使用 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  privateKey: z.string(),
  publicKey: z.string(),
  signature: z.string(),
})

/** 选项契约：Ed25519 自身固定 SHA-512，不提供摘要选项 */
export const optionsSchema = z.object({
  direction: z.union([z.literal('sign'), z.literal('verify')]),
  encoding: z.union([z.literal('base64'), z.literal('hex')]),
})

export type Ed25519Input = z.infer<typeof inputSchema>
export type Ed25519Options = z.infer<typeof optionsSchema>
