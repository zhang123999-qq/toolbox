import { z } from 'zod'

/** 主输入：解析模式下为 Cache-Control 头文本 */
export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20000 字符上限'),
})

export type EdgeCacheInput = z.infer<typeof inputSchema>

/** 选项：mode=build 生成；mode=parse 解析；其余为生成参数 */
export const optionsSchema = z.object({
  mode: z.enum(['build', 'parse']),
  maxAge: z.string(),
  sMaxAge: z.string(),
  staleWhileRevalidate: z.string(),
  immutable: z.boolean(),
  noStore: z.boolean(),
  noCache: z.boolean(),
  mustRevalidate: z.boolean(),
})

export type EdgeCacheOptions = z.infer<typeof optionsSchema>
