import { z } from 'zod'

/** 输入契约：输入框只作触发用 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const ORIGIN_MODES = ['allow-all', 'specific', 'same-origin'] as const

/** 选项契约 */
export const optionsSchema = z.object({
  originMode: z.union([z.literal('allow-all'), z.literal('specific'), z.literal('same-origin')]),
  originList: z.string(),
  methods: z.string(),
  headers: z.string(),
  credentials: z.boolean(),
  maxAge: z.string(),
})

export type CorsConfigInput = z.infer<typeof inputSchema>
export type CorsConfigOptions = z.infer<typeof optionsSchema>
