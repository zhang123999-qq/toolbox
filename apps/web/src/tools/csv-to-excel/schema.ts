import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(5_000_000, '输入超过 5,000,000 字符上限'),
})

/** 选项契约：输出格式 / 首行是否表头 / 源文本分隔符 */
export const optionsSchema = z.object({
  format: z.enum(['xml', 'csv', 'tsv']),
  header: z.boolean(),
  delimiter: z.enum(['comma', 'tab', 'semicolon', 'pipe']),
})

export type CsvToExcelInput = z.infer<typeof inputSchema>
export type CsvToExcelOptions = z.infer<typeof optionsSchema>
