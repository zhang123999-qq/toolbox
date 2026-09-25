import { z } from 'zod'

/** 输入契约 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/**
 * 选项契约。
 * `component` 对应 encodeURIComponent（用于 query 值，`/ ? & =` 都会被转义）；
 * `uri` 对应 encodeURI（用于整条 URL，保留 `:/?#[]@` 等结构字符）。
 */
export const optionsSchema = z.object({
  direction: z.union([z.literal('encode'), z.literal('decode')]),
  mode: z.union([z.literal('component'), z.literal('uri')]),
})

export type UrlCodecInput = z.infer<typeof inputSchema>
export type UrlCodecOptions = z.infer<typeof optionsSchema>
