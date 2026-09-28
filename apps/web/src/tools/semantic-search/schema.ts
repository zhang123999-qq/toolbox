import { z } from 'zod'

/**
 * 输入契约：text 为文档库（每行一篇），query 为查询语句
 * （经 MultiPanel 的 extraInputs 渲染为第二个文本区）。
 */
export const inputSchema = z.object({
  text: z.string(),
  query: z.string(),
})

/** 选项契约：本工具无选项，保留空对象占位 */
export const optionsSchema = z.object({})

export type SemanticSearchInput = z.infer<typeof inputSchema>
export type SemanticSearchOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态（无 MultiPanel 选项） */
export interface SemanticSearchFormOptions {
  [key: string]: never
}
