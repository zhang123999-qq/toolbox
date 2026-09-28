import { z } from 'zod'

/** 输入契约：text 是待查的扩展名（如 .png / png / PNG 都可） */
export const inputSchema = z.object({
  text: z.string().max(100, '扩展名不能超过 100 个字符'),
})

/** 本工具无可调选项 */
export const optionsSchema = z.object({})

export type FileMimeInput = z.infer<typeof inputSchema>
export type FileMimeOptions = z.infer<typeof optionsSchema>
