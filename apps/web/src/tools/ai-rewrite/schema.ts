import { z } from 'zod'

/** 输入契约：待改写的文本 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：改写风格（四选一，中文报错） */
export const optionsSchema = z.object({
  style: z.enum(['formal', 'concise', 'vivid', 'expand'], {
    error: '改写风格只能是 formal / concise / vivid / expand',
  }),
})

export type AiRewriteInput = z.infer<typeof inputSchema>
export type AiRewriteOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态 */
export interface AiRewriteFormOptions {
  style: string
}
