import { z } from 'zod'

/**
 * 输入契约
 * - text：本金（元）
 * - annualRate：年利率（%，如 5；0 表示无利息）
 * - years：年限（年，支持小数）
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  annualRate: z.string().max(100, '年利率过长'),
  years: z.string().max(100, '年限过长'),
})

/** 选项契约：compoundFreq=复利频率 */
export const optionsSchema = z.object({
  compoundFreq: z.enum(['每年', '每半年', '每季度', '每月', '每天']).default('每年'),
})

export type CompoundInterestInput = z.infer<typeof inputSchema>
export type CompoundInterestOptions = z.infer<typeof optionsSchema>
