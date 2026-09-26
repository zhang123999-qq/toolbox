import { z } from 'zod'

/** 输入契约：文本模式下的表格内容 */
export const inputSchema = z.object({
  text: z.string().max(5_000_000, '输入超过 5,000,000 字符上限'),
})

/** 选项契约：源分隔符（auto 为自动识别）/ 输出格式 */
export const optionsSchema = z.object({
  delimiter: z.enum(['auto', 'comma', 'tab', 'semicolon', 'pipe']),
  format: z.enum(['csv', 'tsv']),
})

export type ExcelToCsvInput = z.infer<typeof inputSchema>
export type ExcelToCsvOptions = z.infer<typeof optionsSchema>
