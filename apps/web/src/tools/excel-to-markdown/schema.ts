import { z } from 'zod'

/** 输入契约：转换走左下文件入口，text 框仅作占位 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：sheet 为工作表名，留空表示全部工作表 */
export const optionsSchema = z.object({
  sheet: z.string().max(200, '工作表名超过 200 字符上限'),
})

export type ExcelToMarkdownInput = z.infer<typeof inputSchema>
export type ExcelToMarkdownOptions = z.infer<typeof optionsSchema>
