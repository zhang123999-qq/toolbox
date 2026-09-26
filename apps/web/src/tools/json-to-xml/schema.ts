import { z } from 'zod'

/** 输入契约：JSON 原文，限长 */
export const inputSchema = z.object({
  text: z.string().max(2_000_000, '输入超过 2,000,000 字符上限'),
})

/** 选项契约：字段与 meta.options / Tool.tsx 的 optionDefs 一一对应 */
export const optionsSchema = z.object({
  rootName: z.string().min(1, '根元素名不能为空').max(64, '根元素名过长'),
  declaration: z.boolean(),
  indent: z.union([z.literal('2'), z.literal('4'), z.literal('tab')]),
})

export type JsonToXmlInput = z.infer<typeof inputSchema>
export type JsonToXmlOptions = z.infer<typeof optionsSchema>
