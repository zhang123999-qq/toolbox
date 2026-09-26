import { z } from 'zod'

/** 输入契约：时间戳数字或日期字符串 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：unit 决定时间戳按秒还是毫秒解释 */
export const optionsSchema = z.object({
  unit: z.union([z.literal('auto'), z.literal('s'), z.literal('ms')]),
})

export type TimestampInput = z.infer<typeof inputSchema>
export type TimestampOptions = z.infer<typeof optionsSchema>
