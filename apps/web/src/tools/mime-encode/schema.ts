import { z } from 'zod'

/** 输入契约：邮件头都不长，上限仍按全站统一口径放到 200,000 字符 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/**
 * 选项契约：
 *  direction 决定编码还是解码；
 *  charset 是写进 encoded-word 的字符集标签（B / Q 的字节一律按 UTF-8 产出，见 README 限制）；
 *  mode 是 RFC 2047 的两种编码方式：B = base64，Q = quoted-printable 变体。
 */
export const optionsSchema = z.object({
  direction: z.union([z.literal('encode'), z.literal('decode')]),
  charset: z.union([z.literal('UTF-8'), z.literal('GB2312'), z.literal('ISO-8859-1')]),
  mode: z.union([z.literal('B'), z.literal('Q')]),
})

export type MimeEncodeInput = z.infer<typeof inputSchema>
export type MimeEncodeOptions = z.infer<typeof optionsSchema>
