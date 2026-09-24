import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(100000, '输入超过 100,000 字符上限'),
})

/** 选项契约 */
export const optionsSchema = z.object({
  mode: z.union([
    z.literal('to-spaces'),
    z.literal('to-tabs'),
    z.literal('increase'),
    z.literal('decrease'),
  ]),
  width: z.union([z.literal('2'), z.literal('4'), z.literal('8')]),
})

export type IndentInput = z.infer<typeof inputSchema>
export type IndentOptions = z.infer<typeof optionsSchema>
