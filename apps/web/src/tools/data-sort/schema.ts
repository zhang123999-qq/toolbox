import { z } from 'zod'

/**
 * 输入契约：
 * text=CSV 文本（首行为表头）；sortSpec=排序规则（每行「列名:asc|desc」）。
 * 合法性在 utils 层校验并抛中文错。
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  sortSpec: z.string().max(200000, '排序规则输入超过 200,000 字符上限'),
})

/** 本工具无选项 */
export const optionsSchema = z.object({})

export type DataSortInput = z.infer<typeof inputSchema>
export type DataSortOptions = z.infer<typeof optionsSchema>
