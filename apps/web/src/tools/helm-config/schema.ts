import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  chartName: z.string(),
  version: z.string(),
  description: z.string(),
})

export type HelmConfigInput = z.infer<typeof inputSchema>
export type HelmConfigOptions = z.infer<typeof optionsSchema>
