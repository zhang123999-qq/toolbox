import { z } from 'zod'

/** 输入契约：JSON 样本原文，限长避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(2_000_000, '输入超过 2,000,000 字符上限'),
})

/** 选项契约：字段与 meta.options / Tool.tsx 的 optionDefs 一一对应 */
export const optionsSchema = z.object({
  style: z.union([z.literal('pojo'), z.literal('record'), z.literal('lombok')]),
  mode: z.union([z.literal('public'), z.literal('package')]),
  indent: z.union([z.literal('2'), z.literal('4'), z.literal('tab')]),
})

export type JsonToJavaInput = z.infer<typeof inputSchema>
export type JsonToJavaOptions = z.infer<typeof optionsSchema>
