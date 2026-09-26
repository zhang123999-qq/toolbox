import { z } from 'zod'

/** 输入契约：一整串 compact JWT */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：可选的验签密钥（HMAC 密钥 或 RSA/ES 公钥 PEM） */
export const optionsSchema = z.object({
  secret: z.string(),
  publicKeyPem: z.string(),
})

export type JwtDebugInput = z.infer<typeof inputSchema>
export type JwtDebugOptions = z.infer<typeof optionsSchema>
