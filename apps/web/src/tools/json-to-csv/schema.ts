import { z } from 'zod'

/** 输入契约：JSON 样本原文（对象数组或单对象），限长 */
export const inputSchema = z.object({
  text: z.string().max(2_000_000, '输入超过 2,000,000 字符上限'),
})

/** 选项契约：字段与 meta.options / Tool.tsx 的 optionDefs 一一对应 */
export const optionsSchema = z.object({
  delimiter: z.union([
    z.literal('comma'),
    z.literal('semicolon'),
    z.literal('tab'),
    z.literal('pipe'),
  ]),
  withHeader: z.boolean(),
  quote: z.union([z.literal('needed'), z.literal('all'), z.literal('none')]),
  // flatten：嵌套对象按点号摊平；nested：非标量值整体 JSON 序列化进一格
  style: z.union([z.literal('flatten'), z.literal('nested')]),
})

export type JsonToCsvInput = z.infer<typeof inputSchema>
export type JsonToCsvOptions = z.infer<typeof optionsSchema>
