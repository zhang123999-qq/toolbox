import { z } from 'zod'

/** 输入契约：搜索关键词（空即不过滤） */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：模型筛选与排序 */
export const optionsSchema = z.object({
  modelFilter: z.string({ error: '模型筛选必须是字符串' }),
  sortOrder: z.enum(['newest', 'oldest'], { error: '排序方式非法' }),
})

export type ChatHistoryInput = z.infer<typeof inputSchema>
export type ChatHistoryOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态 */
export interface ChatHistoryFormOptions {
  modelFilter: string
  sortOrder: 'newest' | 'oldest'
}
