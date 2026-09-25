import { z } from 'zod'

/** 输入契约：CDATA 与数字实体会让输出比原文更长，上限放宽到 200,000 字符 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/**
 * 选项契约：
 *  direction 决定转义还是还原；
 *  mode 决定转义写法（命名实体 / 数字实体 / CDATA 段）。
 */
export const optionsSchema = z.object({
  direction: z.union([z.literal('escape'), z.literal('unescape')]),
  mode: z.union([z.literal('entity'), z.literal('numeric'), z.literal('cdata')]),
})

export type XmlEscapeInput = z.infer<typeof inputSchema>
export type XmlEscapeOptions = z.infer<typeof optionsSchema>
