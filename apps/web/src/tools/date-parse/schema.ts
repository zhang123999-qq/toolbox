import { z } from 'zod'

/** 输入契约：自然语言日期串 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：本工具无选项（相对日期一律以今天为基准） */
export const optionsSchema = z.object({})

export type DateParseInput = z.infer<typeof inputSchema>
export type DateParseOptions = z.infer<typeof optionsSchema>
