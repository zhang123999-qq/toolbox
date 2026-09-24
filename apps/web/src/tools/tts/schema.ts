import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20,000 字符上限'),
})

/** 选项契约 */
export const optionsSchema = z.object({
  rate: z.union([
    z.literal('0.5'),
    z.literal('0.8'),
    z.literal('1'),
    z.literal('1.5'),
    z.literal('2'),
  ]),
})

export type TtsInput = z.infer<typeof inputSchema>
export type TtsOptions = z.infer<typeof optionsSchema>
