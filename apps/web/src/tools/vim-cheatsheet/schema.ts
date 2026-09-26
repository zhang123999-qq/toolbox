import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  category: z.union([
    z.literal('all'),
    z.literal('motion'),
    z.literal('edit'),
    z.literal('search'),
    z.literal('visual'),
    z.literal('register'),
    z.literal('window'),
    z.literal('mode'),
  ]),
})

export type VimCheatsheetInput = z.infer<typeof inputSchema>
export type VimCheatsheetOptions = z.infer<typeof optionsSchema>
