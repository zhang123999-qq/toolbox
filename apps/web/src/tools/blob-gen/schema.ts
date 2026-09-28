import { z } from 'zod'

/** 输入契约：text=种子文本（可选，相同文本+参数生成相同形状），留空随机 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：合法性在 utils 层校验并抛中文错 */
export const optionsSchema = z.object({
  complexity: z.string().max(10, '复杂度取值过长'),
  smoothness: z.string().max(10, '平滑度取值过长'),
  fillColor: z.string().max(20, '填充色取值过长'),
  strokeColor: z.string().max(20, '描边色取值过长'),
  strokeWidth: z.string().max(10, '描边宽度取值过长'),
})

export type BlobGenInput = z.infer<typeof inputSchema>
export type BlobGenOptions = z.infer<typeof optionsSchema>
