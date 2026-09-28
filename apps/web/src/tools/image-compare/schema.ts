import { z } from 'zod'

/** 选项契约：mode=对比模式（side 并排 / diff 差异高亮）；threshold=差异阈值 0–255（文本输入，由 utils.parseThreshold 解析） */
export const optionsSchema = z.object({
  mode: z.enum(['side', 'diff']),
  threshold: z.string().max(10, '阈值取值过长'),
})

export type ImageCompareOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小）；两张图各自独立校验 */
export const inputSchema = z.object({
  fileNameA: z.string().max(255).optional(),
  fileNameB: z.string().max(255).optional(),
})
