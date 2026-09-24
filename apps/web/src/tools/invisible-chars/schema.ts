import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(100000, '输入超过 100,000 字符上限'),
})

/** 选项契约 */
export const optionsSchema = z.object({
  mode: z.union([z.literal('mark'), z.literal('remove'), z.literal('list')]),
  keepCommon: z.boolean(),
})

export type InvisibleCharsInput = z.infer<typeof inputSchema>
export type InvisibleCharsOptions = z.infer<typeof optionsSchema>
