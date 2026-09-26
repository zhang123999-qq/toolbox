import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(500, '输入超过 500 字符上限'),
})

export const optionsSchema = z.object({
  bump: z.union([
    z.literal('major'),
    z.literal('minor'),
    z.literal('patch'),
    z.literal('premajor'),
    z.literal('preminor'),
    z.literal('prepatch'),
    z.literal('prerelease'),
  ]),
  preId: z.string().max(20, '预发布标签过长'),
})

export type SemverGenInput = z.infer<typeof inputSchema>
export type SemverGenOptions = z.infer<typeof optionsSchema>
