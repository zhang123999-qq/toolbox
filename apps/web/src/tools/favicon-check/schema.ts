import { z } from 'zod'

/** 输入契约：站点 URL */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：可选粘贴的页面 HTML（用于解析 <link> 图标声明） */
export const optionsSchema = z.object({
  html: z.string().max(200000, 'HTML 超过 200,000 字符上限').default(''),
})

export type FaviconCheckInput = z.infer<typeof inputSchema>
export type FaviconCheckOptions = z.infer<typeof optionsSchema>
