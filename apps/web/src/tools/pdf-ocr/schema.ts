import { z } from 'zod'

/** 输入契约：T3 模板要求 I extends { text: string }；本工具以文件为输入，text 仅占位 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：tesseract 识别语言；chi_sim+eng 一次加载中英两个语言包 */
export const optionsSchema = z.object({
  language: z.union([z.literal('chi_sim+eng'), z.literal('eng'), z.literal('chi_sim')]),
})

export type PdfOcrInput = z.infer<typeof inputSchema>
export type PdfOcrOptions = z.infer<typeof optionsSchema>
