import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  theme: z.union([z.literal('dark'), z.literal('light')]),
  language: z.union([z.literal('js'), z.literal('css'), z.literal('html'), z.literal('plain')]),
  fontSize: z.union([z.literal('12'), z.literal('14'), z.literal('16'), z.literal('20')]),
})

export type CodeToImageInput = z.infer<typeof inputSchema>
export type CodeToImageOptions = z.infer<typeof optionsSchema>
