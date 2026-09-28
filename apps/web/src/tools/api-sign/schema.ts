import { z } from 'zod'

/** 主输入：待签参数 JSON 对象 */
export const inputSchema = z.object({
  text: z.string().max(200000, '参数超过 200000 字符上限'),
})

/** 附加输入：路径 / 密钥 / 时间戳 / 随机串 / 模板 */
export const extraSchema = z.object({
  path: z.string().max(2000, '路径超过 2000 字符上限'),
  secret: z.string().max(2000, '密钥超过 2000 字符上限'),
  timestamp: z.string().max(100, '时间戳超过 100 字符上限'),
  nonce: z.string().max(200, '随机串超过 200 字符上限'),
  template: z.string().max(2000, '模板超过 2000 字符上限'),
})

export type ApiSignInput = z.infer<typeof inputSchema>
export type ApiSignExtra = z.infer<typeof extraSchema>

export const SIGN_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const
export type SignMethod = (typeof SIGN_METHODS)[number]

export const SIGN_ENCODINGS = ['hex', 'base64'] as const
export type SignEncodingOpt = (typeof SIGN_ENCODINGS)[number]
