import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  tl: z.string(),
  tr: z.string(),
  br: z.string(),
  bl: z.string(),
})

export type BorderRadiusInput = z.infer<typeof inputSchema>
export type BorderRadiusOptions = z.infer<typeof optionsSchema>
