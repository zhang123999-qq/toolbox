import { z } from 'zod'

/** 输入契约：text 是明文/密文，key / iv 由附加输入框承载（不塞进 select） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  key: z.string(),
  iv: z.string(),
})

/** 选项契约：方法 / 模式 / 方向 / 密钥编码 / 填充方式 */
export const optionsSchema = z.object({
  method: z.union([z.literal('des'), z.literal('3des')]),
  mode: z.union([z.literal('CBC'), z.literal('ECB')]),
  direction: z.union([z.literal('encrypt'), z.literal('decrypt')]),
  encoding: z.union([z.literal('utf8'), z.literal('hex'), z.literal('base64')]),
  padding: z.union([z.literal('pkcs7'), z.literal('zero'), z.literal('none')]),
})

export type DesInput = z.infer<typeof inputSchema>
export type DesOptions = z.infer<typeof optionsSchema>
