import { z } from 'zod'

/**
 * 输入契约：text=CSV 文本（首行为表头）。
 * 合法性在 utils 层校验并抛中文错。
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：合法性在 utils 层校验并抛中文错 */
export const optionsSchema = z.object({
  pageSize: z.string().max(10, '每页条数取值过长'),
})

export type DataTableInput = z.infer<typeof inputSchema>
export type DataTableOptions = z.infer<typeof optionsSchema>
