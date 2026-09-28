import { z } from 'zod'

/** 输入契约：T2 模板要求 I extends { text: string }；本工具以文件为输入，text 仅占位 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：列分隔符（tab 在 utils 里映射为制表符） */
export const optionsSchema = z.object({
  delimiter: z.union([z.literal(','), z.literal(';'), z.literal('tab')]),
})

export type PdfToCsvInput = z.infer<typeof inputSchema>
export type PdfToCsvOptions = z.infer<typeof optionsSchema>
