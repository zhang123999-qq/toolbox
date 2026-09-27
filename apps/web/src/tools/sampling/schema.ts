import { z } from 'zod'

/**
 * 输入契约
 * - text：总体，每行一个元素（空行自动忽略）
 * - sampleSize：样本量（字符串，utils 内做数值校验）
 * - seed：随机种子（字符串，可空；空 = 真随机）
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  sampleSize: z.string().max(100, '样本量过长'),
  seed: z.string().max(100, '种子过长'),
})

/** 选项契约：replace=true 为有放回抽样，false 为无放回 */
export const optionsSchema = z.object({
  replace: z.boolean().default(false),
})

export type SamplingInput = z.infer<typeof inputSchema>
export type SamplingOptions = z.infer<typeof optionsSchema>
