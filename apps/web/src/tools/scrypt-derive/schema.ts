import { z } from 'zod'

/** 输入契约：text 是口令，salt 由附加输入框承载（不塞进 select） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  salt: z.string(),
})

/** 选项契约：N（块数）/ p（并行度）/ 输出长度 / 输出编码 */
export const optionsSchema = z.object({
  blocks: z.union([z.literal('1024'), z.literal('16384'), z.literal('65536')]),
  parallelism: z.union([z.literal('1'), z.literal('2'), z.literal('4')]),
  length: z.union([z.literal('32'), z.literal('64')]),
  format: z.union([z.literal('hex'), z.literal('base64')]),
})

export type ScryptInput = z.infer<typeof inputSchema>
export type ScryptOptions = z.infer<typeof optionsSchema>
