import { z } from 'zod'

/**
 * 输入契约
 * - text：本金（元）
 * - annualRate：年利率（%，0 表示无息）
 * - termYears：期限（年，支持小数）
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  annualRate: z.string().max(100, '年利率过长'),
  termYears: z.string().max(100, '期限过长'),
})

/** 选项契约：interestType=计息方式（复利按年复利） */
export const optionsSchema = z.object({
  interestType: z.enum(['单利', '复利']).default('单利'),
})

export type InterestInput = z.infer<typeof inputSchema>
export type InterestOptions = z.infer<typeof optionsSchema>
