import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(2000, '输入超过 2,000 字符上限'),
})

export const optionsSchema = z.object({
  level: z.union([z.literal('L'), z.literal('M'), z.literal('Q'), z.literal('H')]),
})

export type QrShareDevInput = z.infer<typeof inputSchema>
export type QrShareDevOptions = z.infer<typeof optionsSchema>
