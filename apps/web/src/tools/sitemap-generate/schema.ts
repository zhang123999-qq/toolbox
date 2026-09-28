import { z } from 'zod'

/** 输入契约：URL 列表，每行一个 */
export const inputSchema = z.object({
  text: z.string().max(100000, '输入超过 100,000 字符上限'),
})

/** 选项契约：changefreq / priority / lastmod，均可选填 */
export const optionsSchema = z.object({
  changefreq: z.string(),
  priority: z.string(),
  lastmod: z.string(),
})

export type SitemapInput = z.infer<typeof inputSchema>
export type SitemapOptions = z.infer<typeof optionsSchema>
