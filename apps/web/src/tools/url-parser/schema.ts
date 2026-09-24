import { z } from 'zod'

/** 输入契约：URL 长度远小于文本工具，1 万字符足够覆盖真实场景 */
export const inputSchema = z.object({
  text: z.string().max(10_000, '输入超过 10000 字符上限'),
})

/** 该工具无选项：解析结果是确定的，保持空对象以满足模板泛型约束 */
export const optionsSchema = z.object({})

export type UrlInput = z.infer<typeof inputSchema>
export type UrlOptions = z.infer<typeof optionsSchema>
