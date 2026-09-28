import { z } from 'zod'

/**
 * 输入契约：
 * text=CSV 文本（首行为表头）；conditions=过滤条件（每行「列名 运算符 值」）。
 * 合法性在 utils 层校验并抛中文错。
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  conditions: z.string().max(200000, '条件输入超过 200,000 字符上限'),
})

/** 选项契约：合法性在 utils 层校验并抛中文错 */
export const optionsSchema = z.object({
  logic: z.string().max(10, '条件关系取值过长'),
})

export type DataFilterInput = z.infer<typeof inputSchema>
export type DataFilterOptions = z.infer<typeof optionsSchema>
