import { z } from 'zod'

/** 输入契约：text=账单金额 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：rate=小费比例（%），people=人数（留空=1） */
export const optionsSchema = z.object({
  rate: z.string(),
  people: z.string(),
})

export type TipInput = z.infer<typeof inputSchema>
export type TipOptions = z.infer<typeof optionsSchema>
