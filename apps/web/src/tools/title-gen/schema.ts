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
    z.literal('neutral'),
    z.literal('seo'),
    z.literal('question'),
    z.literal('howto'),
  ]),
  count: z.union([z.literal('1'), z.literal('3'), z.literal('5')]),
})

export type TitleGenInput = z.infer<typeof inputSchema>
export type TitleGenOptions = z.infer<typeof optionsSchema>
