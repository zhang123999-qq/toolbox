import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(1000, '输入超过 1,000 字符上限'),
})

/** 选项契约：该工具无选项，占位以满足模板泛型约束 */
export const optionsSchema = z.object({})

export type CharsetLookupInput = z.infer<typeof inputSchema>
export type CharsetLookupOptions = z.infer<typeof optionsSchema>
