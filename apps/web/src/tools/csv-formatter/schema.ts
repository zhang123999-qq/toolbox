import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(5_000_000, '输入超过 5,000,000 字符上限'),
})

/** 选项契约：模式 / 分隔符 / 是否把列数不一致当错误 */
export const optionsSchema = z.object({
  mode: z.enum(['align', 'minify', 'validate']),
  delimiter: z.enum(['comma', 'tab', 'semicolon', 'pipe']),
  strict: z.boolean(),
})

export type CsvFormatterInput = z.infer<typeof inputSchema>
export type CsvFormatterOptions = z.infer<typeof optionsSchema>
