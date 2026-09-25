import { z } from 'zod'

/** 输入契约：八进制表示通常比原文更长，上限放到 200,000 字符 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/**
 * 选项契约：
 *  direction 是方向语义（encode = 文本 → 八进制，decode = 八进制 → 文本）；
 *  mode 决定切分口径：char 按 UTF-16 码元（等同 JS 里的 \ooo 转义），
 *  byte 按 UTF-8 字节（跨语言互认，中文/emoji 都按字节展开）。
 */
export const optionsSchema = z.object({
  direction: z.union([z.literal('encode'), z.literal('decode')]),
  mode: z.union([z.literal('char'), z.literal('byte')]),
})

export type OctalInput = z.infer<typeof inputSchema>
export type OctalOptions = z.infer<typeof optionsSchema>
