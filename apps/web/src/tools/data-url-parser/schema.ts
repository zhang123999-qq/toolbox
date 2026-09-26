import { z } from 'zod'

/** 输入契约：Data URL 常把整个小图片塞进来，上限放到 2,000,000 字符 */
export const inputSchema = z.object({
  text: z.string().max(2_000_000, '输入超过 2,000,000 字符上限'),
})

/**
 * 选项契约：
 *  report 给出逐项说明的可读报告；json 给机器可读的结果；
 *  raw 只要还原出的正文（二进制内容退化为十六进制转储）。
 */
export const optionsSchema = z.object({
  format: z.union([z.literal('report'), z.literal('json'), z.literal('raw')]),
})

export type DataUrlParserInput = z.infer<typeof inputSchema>
export type DataUrlParserOptions = z.infer<typeof optionsSchema>
