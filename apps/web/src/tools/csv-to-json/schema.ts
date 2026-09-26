import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(5_000_000, '输入超过 5,000,000 字符上限'),
})

/** 选项契约：首行是否表头 / 分隔符 / 输出缩进 */
export const optionsSchema = z.object({
  header: z.boolean(),
  delimiter: z.enum(['comma', 'tab', 'semicolon', 'pipe']),
  indent: z.enum(['0', '2', '4']),
})

export type CsvToJsonInput = z.infer<typeof inputSchema>
export type CsvToJsonOptions = z.infer<typeof optionsSchema>
