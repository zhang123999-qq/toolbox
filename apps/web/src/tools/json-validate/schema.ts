import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(1_000_000, '输入超过 1,000,000 字符上限'),
})

/** 选项契约：严格模式下重复键视为错误，非严格只给出警告 */
export const optionsSchema = z.object({
  strict: z.boolean(),
})

export type ValidateInput = z.infer<typeof inputSchema>
export type ValidateOptions = z.infer<typeof optionsSchema>
