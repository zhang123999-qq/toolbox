import { z } from 'zod'

/** 输入契约：转换走文件入口，text 框仅作占位 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：目标格式（可选值随源文件类型动态限定） */
export const optionsSchema = z.object({
  target: z.enum(['txt', 'html', 'md', 'json', 'csv', 'xlsx']).default('txt'),
})

export type DocConvertInput = z.infer<typeof inputSchema>
export type DocConvertOptions = z.infer<typeof optionsSchema>
