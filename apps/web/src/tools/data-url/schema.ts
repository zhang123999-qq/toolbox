import { z } from 'zod'

/** 输入契约：Data URL 通常比正文更长，上限放到 200,000 字符 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/**
 * 选项契约：
 *  direction 决定生成还是解析；
 *  mode 决定载荷写法：base64 用 `;base64,` 段，url 用百分号编码的纯文本；
 *  type 是生成时写入的 MIME 类型（解析时以输入里的声明为准，不用这个选项）。
 */
export const optionsSchema = z.object({
  direction: z.union([z.literal('encode'), z.literal('decode')]),
  mode: z.union([z.literal('base64'), z.literal('url')]),
  type: z.string(),
})

export type DataUrlInput = z.infer<typeof inputSchema>
export type DataUrlOptions = z.infer<typeof optionsSchema>
