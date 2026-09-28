import { z } from 'zod'

/** 输入契约：待统计的文本 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：分词器选择 */
export const optionsSchema = z.object({
  tokenizer: z.enum(['o200k', 'cl100k'], { error: '分词器选择非法' }),
})

export type TokenCountInput = z.infer<typeof inputSchema>
export type TokenCountOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态 */
export interface TokenCountFormOptions {
  tokenizer: 'o200k' | 'cl100k'
}
