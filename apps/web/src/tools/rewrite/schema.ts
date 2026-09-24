import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程；附加输入框用于「两段平级内容」 */
export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20,000 字符上限'),
  apiBase: z.string(),
  apiKey: z.string(),
  model: z.string(),
})

/** 选项契约 */
export const optionsSchema = z.object({
  style: z.union([
    z.literal('polish'),
    z.literal('formal'),
    z.literal('casual'),
    z.literal('concise'),
    z.literal('expand'),
  ]),
})

export type RewriteInput = z.infer<typeof inputSchema>
export type RewriteOptions = z.infer<typeof optionsSchema>
