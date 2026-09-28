import { z } from 'zod'

/** 输入契约：待摘要的文本 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：摘要长度（三选一，中文报错） */
export const optionsSchema = z.object({
  length: z.enum(['brief', 'standard', 'detailed'], {
    error: '摘要长度只能是 brief / standard / detailed',
  }),
})

export type AiSummarizeInput = z.infer<typeof inputSchema>
export type AiSummarizeOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态 */
export interface AiSummarizeFormOptions {
  length: string
}
