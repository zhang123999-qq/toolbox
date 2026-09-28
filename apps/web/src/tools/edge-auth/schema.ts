import { z } from 'zod'

/** 主输入：basic 模式下可留空；parse 模式下为待解析的 Authorization 头；jwt 模式下可留空 */
export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20000 字符上限'),
})

export type EdgeAuthInput = z.infer<typeof inputSchema>

/** 选项：mode=basic 生成 Basic Auth Worker；mode=jwt 生成 JWT 片段；mode=parse 解析 Basic 头 */
export const optionsSchema = z.object({
  mode: z.enum(['basic', 'jwt', 'parse']),
  realm: z.string(),
  username: z.string(),
  password: z.string(),
  jwksUrl: z.string(),
  issuer: z.string(),
  audience: z.string(),
})

export type EdgeAuthOptions = z.infer<typeof optionsSchema>
