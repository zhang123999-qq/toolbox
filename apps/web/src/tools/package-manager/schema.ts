import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  pm: z.union([z.literal('npm'), z.literal('yarn'), z.literal('pnpm')]),
})

export type PackageManagerInput = z.infer<typeof inputSchema>
export type PackageManagerOptions = z.infer<typeof optionsSchema>
