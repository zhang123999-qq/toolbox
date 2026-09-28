import { z } from 'zod'

/** 输入契约：待嵌入的文本 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：向量维度 */
export const optionsSchema = z.object({
  dim: z.coerce.number({ error: '维度必须是数字' }).int({ error: '维度必须是整数' }),
})

export type EmbeddingInput = z.infer<typeof inputSchema>
export type EmbeddingOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态 */
export interface EmbeddingFormOptions {
  dim: string
}
