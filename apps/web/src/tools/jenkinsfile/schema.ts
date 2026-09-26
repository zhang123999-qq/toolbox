import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  agent: z.union([z.literal('any'), z.literal('none')]),
  stages: z.string(),
  post: z.boolean(),
})

export type JenkinsfileInput = z.infer<typeof inputSchema>
export type JenkinsfileOptions = z.infer<typeof optionsSchema>
