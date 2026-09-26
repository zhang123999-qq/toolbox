import { z } from 'zod'

/** 输入契约：粘贴 CSV/TSV 文本（.xlsx 走文件入口），限长与 excel-to-csv 对齐 */
export const inputSchema = z.object({
  text: z.string().max(5_000_000, '输入超过 5,000,000 字符上限'),
})

/** 选项契约：withHeader=true 时首行作为对象字段名 */
export const optionsSchema = z.object({
  withHeader: z.boolean(),
})

export type ExcelToJsonInput = z.infer<typeof inputSchema>
export type ExcelToJsonOptions = z.infer<typeof optionsSchema>
