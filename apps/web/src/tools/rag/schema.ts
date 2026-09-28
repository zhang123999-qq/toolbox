import { z } from 'zod'

/**
 * 输入契约：text 为文档内容，query 为问题
 * （经 MultiPanel 的 extraInputs 渲染为第二个文本区）。
 */
export const inputSchema = z.object({
  text: z.string(),
  query: z.string(),
})

/** 选项契约：检索片段数 k（1～10 的整数，中文报错） */
export const optionsSchema = z.object({
  k: z.coerce
    .number({ error: '检索片段数必须是数字' })
    .int({ error: '检索片段数必须是整数' })
    .min(1, { error: '检索片段数不能小于 1' })
    .max(10, { error: '检索片段数不能大于 10' }),
})

export type RagInput = z.infer<typeof inputSchema>
export type RagOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：文本框的值是字符串，处理时再经 optionsSchema 校验 */
export interface RagFormOptions {
  k: string
}
