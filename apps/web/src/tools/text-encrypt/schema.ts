import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程；附加输入框用于「两段平级内容」 */
export const inputSchema = z.object({
  text: z.string().max(100000, '输入超过 100,000 字符上限'),
  password: z.string(),
})

/** 选项契约 */
export const optionsSchema = z.object({
  mode: z.union([z.literal('encrypt'), z.literal('decrypt')]),
})

export type TextEncryptInput = z.infer<typeof inputSchema>
export type TextEncryptOptions = z.infer<typeof optionsSchema>
