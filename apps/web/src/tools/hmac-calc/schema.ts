import { z } from 'zod'

/** 输入契约：`text` 是待认证的消息，`key` 是密钥（由 extraInputs 承载，行数 1） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  key: z.string().max(200000, '密钥超过 200,000 字符上限'),
})

/** 选项契约：algorithm 选哈希，format 选输出编码，type 说明密钥是文本还是十六进制 */
export const optionsSchema = z.object({
  algorithm: z.union([
    z.literal('SHA-1'),
    z.literal('SHA-256'),
    z.literal('SHA-384'),
    z.literal('SHA-512'),
  ]),
  format: z.union([z.literal('hex'), z.literal('base64')]),
  type: z.union([z.literal('text'), z.literal('hex')]),
})

export type HmacInput = z.infer<typeof inputSchema>
export type HmacOptions = z.infer<typeof optionsSchema>
