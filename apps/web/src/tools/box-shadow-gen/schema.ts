import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  offsetX: z.string(),
  offsetY: z.string(),
  blur: z.string(),
  spread: z.string(),
  color: z.string(),
  inset: z.boolean(),
})

export type BoxShadowInput = z.infer<typeof inputSchema>
export type BoxShadowOptions = z.infer<typeof optionsSchema>
