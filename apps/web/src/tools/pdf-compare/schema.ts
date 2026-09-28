import { z } from 'zod'

/** 选项契约：threshold=差异阈值 0–255（文本输入，由 utils.parseThreshold 解析）；view=选中页的详情视图（side 并排 / overlay 叠加高亮） */
export const optionsSchema = z.object({
  threshold: z.string().max(10, '阈值取值过长'),
  view: z.enum(['side', 'overlay']),
})

export type PdfCompareOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（%PDF 魔数/大小）；两份 PDF 各自独立校验 */
export const inputSchema = z.object({
  fileNameA: z.string().max(255).optional(),
  fileNameB: z.string().max(255).optional(),
})
