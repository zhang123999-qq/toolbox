import { z } from 'zod'

export const MEASURE_TIMES = [1, 3, 5] as const

/** 输入契约：待测页面 URL */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：测量次数 */
export const optionsSchema = z.object({
  times: z.union([z.literal(1), z.literal(3), z.literal(5)]),
})

export type SpeedTestInput = z.infer<typeof inputSchema>
export type SpeedTestOptions = z.infer<typeof optionsSchema>
