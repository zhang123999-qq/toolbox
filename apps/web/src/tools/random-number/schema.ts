import { z } from 'zod'

/**
 * 输入契约
 * - text：生成数量（留空=10）
 * - min / max：数值范围（留空=1 / 100）
 * - decimals：小数位数（留空=0，即整数）
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  min: z.string().max(100, '最小值过长'),
  max: z.string().max(100, '最大值过长'),
  decimals: z.string().max(10, '小数位数过长'),
})

/** 选项契约：unique=不重复抽取（仅整数模式有效） */
export const optionsSchema = z.object({
  unique: z.boolean().default(false),
})

export type RandomNumberInput = z.infer<typeof inputSchema>
export type RandomNumberOptions = z.infer<typeof optionsSchema>
