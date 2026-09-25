import { z } from 'zod'

/** 输入契约 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：mode 选择 ASCII85（Adobe）或 Z85（ZeroMQ） */
export const optionsSchema = z.object({
  direction: z.union([z.literal('encode'), z.literal('decode')]),
  mode: z.union([z.literal('ascii85'), z.literal('z85')]),
})

export type Base85Input = z.infer<typeof inputSchema>
export type Base85Options = z.infer<typeof optionsSchema>
