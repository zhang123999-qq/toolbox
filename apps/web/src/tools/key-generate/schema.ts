import { z } from 'zod'

/**
 * 输入契约：生成密钥不需要输入内容，`text` 只作「触发」用
 * （与 #random 域的 password-generator 采用同一约定：空串不生成，填任意内容即触发一次）。
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：类型 / 位数 / 曲线 / 输出格式 */
export const optionsSchema = z.object({
  type: z.union([z.literal('aes-hmac'), z.literal('rsa'), z.literal('ec'), z.literal('ed25519')]),
  bits: z.union([
    z.literal('128'),
    z.literal('192'),
    z.literal('256'),
    z.literal('2048'),
    z.literal('3072'),
    z.literal('4096'),
  ]),
  curve: z.union([
    z.literal('P-256'),
    z.literal('P-384'),
    z.literal('P-521'),
    z.literal('Ed25519'),
  ]),
  format: z.union([z.literal('hex'), z.literal('base64'), z.literal('jwk'), z.literal('pem')]),
})

export type KeyGenInput = z.infer<typeof inputSchema>
export type KeyGenOptions = z.infer<typeof optionsSchema>
