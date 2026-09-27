import { z } from 'zod'

/**
 * 输入契约：多行文本
 *   第 1 行：开始日期 YYYY-MM-DD
 *   第 2 行：工作日天数（整数）
 *   其余行：自定义排除日（每行一个 YYYY-MM-DD）
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 方向：加工作日 / 减工作日 */
export const optionsSchema = z.object({
  direction: z.union([z.literal('add'), z.literal('subtract')]),
})

export type WorkdayInput = z.infer<typeof inputSchema>
export type WorkdayOptions = z.infer<typeof optionsSchema>
