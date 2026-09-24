import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(100000, '输入超过 100,000 字符上限'),
})

/** 选项契约 */
export const optionsSchema = z.object({
  delimiter: z.union([
    z.literal('auto'),
    z.literal('comma'),
    z.literal('tab'),
    z.literal('semicolon'),
    z.literal('pipe'),
    z.literal('space'),
  ]),
  style: z.union([z.literal('plain'), z.literal('grid')]),
  header: z.boolean(),
})

export type TextToTableInput = z.infer<typeof inputSchema>
export type TextToTableOptions = z.infer<typeof optionsSchema>
