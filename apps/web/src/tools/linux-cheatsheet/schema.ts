import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  category: z.union([
    z.literal('all'),
    z.literal('file'),
    z.literal('process'),
    z.literal('network'),
    z.literal('permission'),
    z.literal('disk'),
    z.literal('user'),
    z.literal('search'),
    z.literal('archive'),
  ]),
})

export type LinuxCheatsheetInput = z.infer<typeof inputSchema>
export type LinuxCheatsheetOptions = z.infer<typeof optionsSchema>
