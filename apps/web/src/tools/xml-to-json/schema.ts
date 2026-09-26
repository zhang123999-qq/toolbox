import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(2_000_000, '输入超过 2,000,000 字符上限'),
})

/** 选项契约：属性前缀 / 数组归一策略 / 文本节点键名 / 输出缩进 */
export const optionsSchema = z.object({
  prefix: z.enum(['@', '_', '$']),
  mode: z.enum(['auto', 'always', 'never']),
  textKey: z.enum(['#text', 'value', 'text']),
  indent: z.enum(['0', '2', '4']),
})

export type XmlToJsonInput = z.infer<typeof inputSchema>
export type XmlToJsonOptions = z.infer<typeof optionsSchema>
