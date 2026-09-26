import { z } from 'zod'

/** 输入契约：JSON 原文，限长 */
export const inputSchema = z.object({
  text: z.string().max(2_000_000, '输入超过 2,000,000 字符上限'),
})

/** 选项契约：字段与 meta.options / Tool.tsx 的 optionDefs 一一对应 */
export const optionsSchema = z.object({
  indent: z.union([z.literal('2'), z.literal('4')]),
  // needed：仅在有歧义时加双引号；all：所有字符串都加双引号
  quote: z.union([z.literal('needed'), z.literal('all')]),
})

export type JsonToYamlInput = z.infer<typeof inputSchema>
export type JsonToYamlOptions = z.infer<typeof optionsSchema>
