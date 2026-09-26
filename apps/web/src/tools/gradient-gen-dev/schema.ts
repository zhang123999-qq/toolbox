import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  type: z.union([z.literal('linear'), z.literal('radial'), z.literal('conic')]),
  angle: z.string(),
  color1: z.string(),
  pos1: z.string(),
  color2: z.string(),
  pos2: z.string(),
  color3: z.string(),
  pos3: z.string(),
})

export type GradientGenInput = z.infer<typeof inputSchema>
export type GradientGenOptions = z.infer<typeof optionsSchema>
