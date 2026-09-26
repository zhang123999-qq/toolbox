import { z } from 'zod'

/** 输入契约：JSON 样本原文，限长避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(2_000_000, '输入超过 2,000,000 字符上限'),
})

/** 选项契约：字段与 meta.options / Tool.tsx 的 optionDefs 一一对应 */
export const optionsSchema = z.object({
  mode: z.union([z.literal('nested'), z.literal('inline')]),
  style: z.union([z.literal('omitempty'), z.literal('plain')]),
  indent: z.union([z.literal('2'), z.literal('4'), z.literal('tab')]),
})

export type JsonToGoInput = z.infer<typeof inputSchema>
export type JsonToGoOptions = z.infer<typeof optionsSchema>
