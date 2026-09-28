import { z } from 'zod'

/** 输入契约：每行一条 "标签：文本"（或纯文本，标签自动编号） */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：嵌入维度 */
export const optionsSchema = z.object({
  dim: z.coerce.number({ error: '维度必须是数字' }).int({ error: '维度必须是整数' }),
})

export type EmbeddingVisInput = z.infer<typeof inputSchema>
export type EmbeddingVisOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态 */
export interface EmbeddingVisFormOptions {
  dim: string
}
