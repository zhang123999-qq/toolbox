import { z } from 'zod'

/**
 * 输入契约
 * - text：贷款本金（元）
 * - annualRate：年利率（%，如 4.9）
 * - years：贷款年限（年，支持小数如 2.5）
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  annualRate: z.string().max(100, '年利率过长'),
  years: z.string().max(100, '贷款年限过长'),
})

/** 选项契约：repayMethod=还款方式 */
export const optionsSchema = z.object({
  repayMethod: z.enum(['等额本息', '等额本金']).default('等额本息'),
})

export type LoanInput = z.infer<typeof inputSchema>
export type LoanOptions = z.infer<typeof optionsSchema>
