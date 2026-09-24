import { z } from 'zod'

/** 输入契约：Cookie 串或 JSON 对象文本 */
export const inputSchema = z.object({
  text: z.string().max(100_000, '输入超过 100000 字符上限'),
})

/** 选项契约：方向（解析 / 生成）与是否按键名排序 */
export const optionsSchema = z.object({
  mode: z.union([z.literal('parse'), z.literal('build')]),
  sortKeys: z.boolean(),
})

export type CookieInput = z.infer<typeof inputSchema>
export type CookieOptions = z.infer<typeof optionsSchema>
