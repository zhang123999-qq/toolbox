import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(5_000_000, '输入超过 5MB 上限'),
})

/** 选项契约：是否按键名重排后再压缩 */
export const optionsSchema = z.object({
  sortKeys: z.boolean(),
})

export type MinifyInput = z.infer<typeof inputSchema>
export type MinifyOptions = z.infer<typeof optionsSchema>
