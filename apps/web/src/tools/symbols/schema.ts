import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(100, '输入超过 100 字符上限'),
})

/** 选项契约 */
export const optionsSchema = z.object({
  category: z.union([
    z.literal('all'),
    z.literal('math'),
    z.literal('arrow'),
    z.literal('currency'),
    z.literal('unit'),
    z.literal('punct'),
    z.literal('box'),
    z.literal('star'),
    z.literal('check'),
    z.literal('number'),
    z.literal('greek'),
    z.literal('roman'),
  ]),
})

export type SymbolsInput = z.infer<typeof inputSchema>
export type SymbolsOptions = z.infer<typeof optionsSchema>
