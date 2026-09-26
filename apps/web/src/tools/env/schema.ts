import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  keepComments: z.boolean(),
})

export type EnvInput = z.infer<typeof inputSchema>
export type EnvOptions = z.infer<typeof optionsSchema>
