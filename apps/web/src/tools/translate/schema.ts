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
  source: z.union([
    z.literal('auto'),
    z.literal('zh'),
    z.literal('en'),
    z.literal('ja'),
    z.literal('ko'),
    z.literal('fr'),
    z.literal('de'),
    z.literal('es'),
    z.literal('ru'),
  ]),
  target: z.union([
    z.literal('en'),
    z.literal('zh'),
    z.literal('ja'),
    z.literal('ko'),
    z.literal('fr'),
    z.literal('de'),
    z.literal('es'),
    z.literal('ru'),
  ]),
})

export type TranslateInput = z.infer<typeof inputSchema>
export type TranslateOptions = z.infer<typeof optionsSchema>
