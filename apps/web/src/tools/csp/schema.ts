import { z } from 'zod'

/** 输入契约：输入框只作触发用（内容不参与策略），上限按通用文本口径 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：mode 选输出正式头还是 Report-Only 观察头 */
export const optionsSchema = z.object({
  mode: z.union([z.literal('header'), z.literal('report-only')]),
  target: z.union([z.literal('self'), z.literal('none')]),
  strict: z.boolean(),
  includeLower: z.boolean(),
  includeUpper: z.boolean(),
  includeNumbers: z.boolean(),
})

export type CspInput = z.infer<typeof inputSchema>
export type CspOptions = z.infer<typeof optionsSchema>
