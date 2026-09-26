import { z } from 'zod'

export const COMMIT_TYPES = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'chore',
  'ci',
  'build',
  'revert',
] as const

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  type: z.enum(COMMIT_TYPES),
  scope: z.string(),
  description: z.string(),
  body: z.string(),
  breaking: z.boolean(),
  footer: z.string(),
})

export type CommitGenInput = z.infer<typeof inputSchema>
export type CommitGenOptions = z.infer<typeof optionsSchema>
