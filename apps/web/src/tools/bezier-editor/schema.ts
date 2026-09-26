import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  x1: z.string(),
  y1: z.string(),
  x2: z.string(),
  y2: z.string(),
})

export type BezierEditorInput = z.infer<typeof inputSchema>
export type BezierEditorOptions = z.infer<typeof optionsSchema>
