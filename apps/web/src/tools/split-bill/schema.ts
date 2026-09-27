import { z } from 'zod'

/** 输入契约：text=消费总额，textB=人数 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  textB: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：tipRate=小费比例（%） */
export const optionsSchema = z.object({
  tipRate: z.string(),
})

export type SplitBillInput = z.infer<typeof inputSchema>
export type SplitBillOptions = z.infer<typeof optionsSchema>
