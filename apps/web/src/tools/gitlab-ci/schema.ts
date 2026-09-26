import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  image: z.string(),
  stages: z.string(),
  script: z.string(),
})

export type GitlabCiInput = z.infer<typeof inputSchema>
export type GitlabCiOptions = z.infer<typeof optionsSchema>
