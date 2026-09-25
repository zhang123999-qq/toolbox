import { z } from 'zod'

/** 输入契约：text 是明文/密文；key / iv 由附加输入框承载（不塞进 select） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  key: z.string(),
  iv: z.string(),
})

/** 选项契约：方法 / 密钥位数 / 方向 / 密钥与 IV 的字符串编码 */
export const optionsSchema = z.object({
  method: z.union([z.literal('GCM'), z.literal('CBC')]),
  bits: z.union([z.literal('128'), z.literal('192'), z.literal('256')]),
  direction: z.union([z.literal('encrypt'), z.literal('decrypt')]),
  encoding: z.union([z.literal('utf8'), z.literal('hex'), z.literal('base64')]),
})

export type AesInput = z.infer<typeof inputSchema>
export type AesOptions = z.infer<typeof optionsSchema>
