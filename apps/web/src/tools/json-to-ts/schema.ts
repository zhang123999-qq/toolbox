import { z } from 'zod'

/** 输入契约：JSON 样本原文，限长避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(2_000_000, '输入超过 2,000,000 字符上限'),
})

/** 选项契约：字段与 meta.options / Tool.tsx 的 optionDefs 一一对应 */
export const optionsSchema = z.object({
  type: z.union([z.literal('interface'), z.literal('type')]),
  mode: z.union([z.literal('none'), z.literal('export'), z.literal('declare')]),
  style: z.union([z.literal('mutable'), z.literal('readonly')]),
  strict: z.boolean(),
  indent: z.union([z.literal('2'), z.literal('4'), z.literal('tab')]),
})

export type JsonToTsInput = z.infer<typeof inputSchema>
export type JsonToTsOptions = z.infer<typeof optionsSchema>
