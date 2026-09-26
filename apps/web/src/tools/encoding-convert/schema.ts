import { z } from 'zod'

/** 输入契约：待转文本或字节表示；Base64 / 十六进制都会比原文长，上限放到 500,000 */
export const inputSchema = z.object({
  text: z.string().max(500_000, '输入超过 500,000 字符上限'),
})

/**
 * 选项契约：
 *  direction 决定「文本 → 字节」还是「字节 → 文本」；
 *  encoding 是另一端的字符集（本工具自身一律以 UTF-8 承载文本）；
 *  format 是字节侧的写法：hex / base64 / latin1 —— latin1 就是常见的「乱码串」形态。
 */
export const optionsSchema = z.object({
  direction: z.union([z.literal('encode'), z.literal('decode')]),
  encoding: z.union([
    z.literal('utf-8'),
    z.literal('utf-16le'),
    z.literal('utf-16be'),
    z.literal('gbk'),
    z.literal('gb18030'),
    z.literal('big5'),
    z.literal('shift_jis'),
    z.literal('euc-jp'),
    z.literal('euc-kr'),
    z.literal('iso-8859-1'),
    z.literal('windows-1252'),
    z.literal('koi8-r'),
  ]),
  format: z.union([z.literal('hex'), z.literal('base64'), z.literal('latin1')]),
})

export type EncodingConvertInput = z.infer<typeof inputSchema>
export type EncodingConvertOptions = z.infer<typeof optionsSchema>
