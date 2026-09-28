import { z } from 'zod'

/** 输入契约：text 为代码源码 */
export const inputSchema = z.object({
  text: z.string().max(100000, '输入超过 100,000 字符上限'),
})

/** 选项契约：字号/边距为 pt 数值字符串；lineNumbers 控制行号开关 */
export const optionsSchema = z.object({
  fontSize: z.union([z.literal('9'), z.literal('10'), z.literal('12')]),
  lineNumbers: z.boolean(),
  margin: z.union([z.literal('36'), z.literal('54'), z.literal('72')]),
})

export type CodeToPdfInput = z.infer<typeof inputSchema>
export type CodeToPdfOptions = z.infer<typeof optionsSchema>
