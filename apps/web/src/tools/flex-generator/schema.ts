import { z } from 'zod'

export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  direction: z.union([
    z.literal('row'),
    z.literal('row-reverse'),
    z.literal('column'),
    z.literal('column-reverse'),
  ]),
  justify: z.union([
    z.literal('flex-start'),
    z.literal('center'),
    z.literal('flex-end'),
    z.literal('space-between'),
    z.literal('space-around'),
    z.literal('space-evenly'),
  ]),
  align: z.union([
    z.literal('stretch'),
    z.literal('center'),
    z.literal('flex-start'),
    z.literal('flex-end'),
    z.literal('baseline'),
  ]),
  wrap: z.union([z.literal('nowrap'), z.literal('wrap'), z.literal('wrap-reverse')]),
  gap: z.string(),
})

export type FlexGeneratorInput = z.infer<typeof inputSchema>
export type FlexGeneratorOptions = z.infer<typeof optionsSchema>
