import { z } from 'zod'

/** 输入契约：一个日期串 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：财年起始月（默认 1 月；4=日本/微软，7=澳大利亚/美国政府） */
export const optionsSchema = z.object({
  startMonth: z.union([z.literal('1'), z.literal('4'), z.literal('7'), z.literal('10')]),
})

export type FiscalYearInput = z.infer<typeof inputSchema>
export type FiscalYearOptions = z.infer<typeof optionsSchema>
