import { z } from 'zod'

/** 输入契约：十六进制串通常是原文的两倍长，上限放宽到 200,000 字符 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/**
 * 选项契约：
 *  direction 决定编码还是解码；
 *  separator 决定字节之间的分隔写法（无 / 空格 / 连字符 / 0x 前缀）；
 *  uppercase 决定十六进制用大写还是小写字母。
 */
export const optionsSchema = z.object({
  direction: z.union([z.literal('encode'), z.literal('decode')]),
  separator: z.union([z.literal('none'), z.literal('space'), z.literal('hyphen'), z.literal('0x')]),
  uppercase: z.boolean(),
})

export type HexInput = z.infer<typeof inputSchema>
export type HexOptions = z.infer<typeof optionsSchema>
