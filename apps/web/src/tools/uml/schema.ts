import { z } from 'zod'

/** 输入契约：text=Mermaid UML 类图源码 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：本工具无选项 */
export const optionsSchema = z.object({})

export type UmlInput = z.infer<typeof inputSchema>
export type UmlOptions = z.infer<typeof optionsSchema>
