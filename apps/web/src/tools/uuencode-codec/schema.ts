import { z } from 'zod'

/** 输入契约：编码后文本会变长（3 字节 → 4 字符），上限收紧到 200,000 字符 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：direction 决定编码/解码，prefix 是 begin 行里的文件名 */
export const optionsSchema = z.object({
  direction: z.union([z.literal('encode'), z.literal('decode')]),
  prefix: z.string(),
})

export type UuencodeInput = z.infer<typeof inputSchema>
export type UuencodeOptions = z.infer<typeof optionsSchema>
