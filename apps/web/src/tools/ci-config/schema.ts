import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  branch: z.string(),
  nodeVersion: z.union([z.literal('18'), z.literal('20'), z.literal('22')]),
  install: z.boolean(),
  test: z.boolean(),
  build: z.boolean(),
  deploy: z.boolean(),
})

export type CiConfigInput = z.infer<typeof inputSchema>
export type CiConfigOptions = z.infer<typeof optionsSchema>
