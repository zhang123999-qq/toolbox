import { z } from 'zod'

/** 输入契约：text=Mermaid 时序图源码 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：本工具无选项 */
export const optionsSchema = z.object({})

export type SequenceInput = z.infer<typeof inputSchema>
export type SequenceOptions = z.infer<typeof optionsSchema>
