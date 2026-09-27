import { z } from 'zod'

/**
 * 输入契约
 * - text：原价（元）
 * - discountRate：折扣（%），如 20 表示减 20%（即 8 折）
 * - quantity：数量（正整数，留空=1）
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  discountRate: z.string().max(100, '折扣过长'),
  quantity: z.string().max(100, '数量过长'),
})

/** 选项契约：本工具无选项 */
export const optionsSchema = z.object({})

export type DiscountInput = z.infer<typeof inputSchema>
export type DiscountOptions = z.infer<typeof optionsSchema>
