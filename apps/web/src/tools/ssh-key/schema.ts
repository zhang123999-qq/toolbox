import { z } from 'zod'

/** 输入契约：输入框内容会作为公钥末尾的注释，上限仍按通用文本口径 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：algorithm 选曲线/算法族，bits 只对 RSA 生效 */
export const optionsSchema = z.object({
  algorithm: z.union([z.literal('ed25519'), z.literal('rsa')]),
  bits: z.union([z.literal('2048'), z.literal('3072'), z.literal('4096')]),
})

export type SshKeyInput = z.infer<typeof inputSchema>
export type SshKeyOptions = z.infer<typeof optionsSchema>
