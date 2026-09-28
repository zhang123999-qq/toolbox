import { z } from 'zod'

/** 交互式量表工具：无文本输入 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({})

export type PsychologyInput = z.infer<typeof inputSchema>
export type PsychologyOptions = z.infer<typeof optionsSchema>
