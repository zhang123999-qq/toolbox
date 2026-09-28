import { z } from 'zod'

/**
 * 输入契约：text=ABI JSON 数组文本；keyword=名称过滤关键字（选项）。
 * JSON 非法、结构非法在 utils 层抛中文错。
 */
export const inputSchema = z.object({
  text: z.string().max(500000, '输入超过 500,000 字符上限'),
})

export const optionsSchema = z.object({
  keyword: z.string().max(200, '关键字过长'),
})

export type ContractAbiInput = z.infer<typeof inputSchema>
export type ContractAbiOptions = z.infer<typeof optionsSchema>
