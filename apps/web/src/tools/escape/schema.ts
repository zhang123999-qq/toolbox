import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(100000, '输入超过 100,000 字符上限'),
})

/** 选项契约 */
export const optionsSchema = z.object({
  type: z.union([
    z.literal('js'),
    z.literal('html'),
    z.literal('css'),
    z.literal('json'),
    z.literal('sql'),
  ]),
  mode: z.union([z.literal('escape'), z.literal('unescape')]),
})

export type EscapeInput = z.infer<typeof inputSchema>
export type EscapeOptions = z.infer<typeof optionsSchema>
