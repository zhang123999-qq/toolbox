import { z } from 'zod'

/** 输入契约：Quoted-Printable 通常比原文更长，上限放到 200,000 字符 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/**
 * 选项契约：
 *  direction 决定编码还是解码；
 *  length 是编码时每行的最大字符数（RFC 2045 规定不超过 76），用字符串是因为
 *  它来自自由输入框；非法值在 transform 里转成可读错误。
 */
export const optionsSchema = z.object({
  direction: z.union([z.literal('encode'), z.literal('decode')]),
  length: z.string(),
})

export type QuotedPrintableInput = z.infer<typeof inputSchema>
export type QuotedPrintableOptions = z.infer<typeof optionsSchema>
