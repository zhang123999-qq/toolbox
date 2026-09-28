import { z } from 'zod'

/** 输入契约：规则文本，每行「User-agent 指令 路径」 */
export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20,000 字符上限'),
})

/** 选项契约：Sitemap URL 与 Crawl-delay（秒），均可选填 */
export const optionsSchema = z.object({
  sitemap: z.string(),
  crawlDelay: z.string(),
})

export type RobotsInput = z.infer<typeof inputSchema>
export type RobotsOptions = z.infer<typeof optionsSchema>
