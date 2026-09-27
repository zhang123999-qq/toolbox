import { z } from 'zod'

/** 输入契约：text=原价；textB=折扣（如 8.5 表示 8.5 折）或折后价（由 mode 决定） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  textB: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：mode=计算方式（按折扣率 / 按折后价） */
export const optionsSchema = z.object({
  mode: z.string(),
})

export type DiscountInput = z.infer<typeof inputSchema>
export type DiscountOptions = z.infer<typeof optionsSchema>
