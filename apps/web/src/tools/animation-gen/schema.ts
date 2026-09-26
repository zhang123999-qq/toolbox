import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  name: z.string(),
  duration: z.string(),
  timing: z.union([
    z.literal('ease'),
    z.literal('linear'),
    z.literal('ease-in'),
    z.literal('ease-out'),
    z.literal('ease-in-out'),
  ]),
  delay: z.string(),
  iteration: z.union([z.literal('infinite'), z.literal('1'), z.literal('2'), z.literal('3')]),
  direction: z.union([
    z.literal('normal'),
    z.literal('reverse'),
    z.literal('alternate'),
    z.literal('alternate-reverse'),
  ]),
  from: z.string(),
  to: z.string(),
})

export type AnimationGenInput = z.infer<typeof inputSchema>
export type AnimationGenOptions = z.infer<typeof optionsSchema>
