import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  columns: z.string(),
  rows: z.string(),
  gap: z.string(),
  justifyItems: z.union([
    z.literal('stretch'),
    z.literal('start'),
    z.literal('center'),
    z.literal('end'),
  ]),
  alignItems: z.union([
    z.literal('stretch'),
    z.literal('start'),
    z.literal('center'),
    z.literal('end'),
  ]),
})

export type GridGeneratorInput = z.infer<typeof inputSchema>
export type GridGeneratorOptions = z.infer<typeof optionsSchema>
