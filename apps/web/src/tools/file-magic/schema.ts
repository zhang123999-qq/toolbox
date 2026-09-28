import { z } from 'zod'

/** 本工具走文件入口，文本区仅作说明 */
export const inputSchema = z.object({
  text: z.string().max(1000, '文本不能超过 1000 个字符'),
})

/** 本工具无可调选项 */
export const optionsSchema = z.object({})

export type FileMagicInput = z.infer<typeof inputSchema>
export type FileMagicOptions = z.infer<typeof optionsSchema>
