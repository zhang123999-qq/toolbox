import { z } from 'zod'

export const MAX_INPUT = 200_000

/** 输入契约：robots.txt 文本 */
export const inputSchema = z.object({
  text: z.string().max(MAX_INPUT, `输入超过 ${MAX_INPUT} 字符上限`),
})

/** 无选项 */
export const optionsSchema = z.object({})

export type RobotsCheckInput = z.infer<typeof inputSchema>
export type RobotsCheckOptions = z.infer<typeof optionsSchema>
