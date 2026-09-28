import { z } from 'zod'

/** 主输入：待加密明文 / 待解密载荷 JSON */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200000 字符上限'),
})

/** 附加输入：密码 */
export const extraSchema = z.object({
  password: z.string().max(2000, '密码超过 2000 字符上限'),
})

export type ApiEncryptInput = z.infer<typeof inputSchema>
export type ApiEncryptExtra = z.infer<typeof extraSchema>

export const ENCRYPT_MODES = ['encrypt', 'decrypt'] as const
export type EncryptMode = (typeof ENCRYPT_MODES)[number]
