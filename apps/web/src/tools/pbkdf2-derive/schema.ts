import { z } from 'zod'

/** 输入契约：text 是口令，salt 由附加输入框承载（不塞进 select） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  salt: z.string(),
})

/** 选项契约：算法 / 迭代次数 / 输出长度 / 盐的编码 / 输出的编码 */
export const optionsSchema = z.object({
  algorithm: z.union([
    z.literal('SHA-1'),
    z.literal('SHA-256'),
    z.literal('SHA-384'),
    z.literal('SHA-512'),
  ]),
  iterations: z.union([
    z.literal('1000'),
    z.literal('10000'),
    z.literal('100000'),
    z.literal('600000'),
  ]),
  length: z.union([z.literal('16'), z.literal('32'), z.literal('64')]),
  encoding: z.union([z.literal('utf8'), z.literal('hex')]),
  format: z.union([z.literal('hex'), z.literal('base64')]),
})

export type Pbkdf2Input = z.infer<typeof inputSchema>
export type Pbkdf2Options = z.infer<typeof optionsSchema>
