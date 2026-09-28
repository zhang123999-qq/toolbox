import { z } from 'zod'

/** 输入契约：页面标题 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：目标关键词（可选） */
export const optionsSchema = z.object({
  keyword: z.string().max(100, '关键词超过 100 字符上限').default(''),
})

export type TitleCheckInput = z.infer<typeof inputSchema>
export type TitleCheckOptions = z.infer<typeof optionsSchema>
