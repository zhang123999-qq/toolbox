import { z } from 'zod'

/** 输入契约：一次请求 / 响应头通常很短，200,000 字符足够容纳极端的 Cookie 头 */
export const inputSchema = z.object({
  text: z.string().max(200_000, '输入超过 200,000 字符上限'),
})

/**
 * 选项契约：
 *  direction 决定是「把头文本拆开」还是「把键值对拼回头文本」；
 *  format 决定解析输出与构建输入的写法：json 走 JSON，text 走可读文本 / `名称: 值` 行。
 */
export const optionsSchema = z.object({
  direction: z.union([z.literal('parse'), z.literal('build')]),
  format: z.union([z.literal('json'), z.literal('text')]),
})

export type HttpHeaderInput = z.infer<typeof inputSchema>
export type HttpHeaderOptions = z.infer<typeof optionsSchema>
