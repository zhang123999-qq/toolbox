import { z } from 'zod'

/**
 * 选项契约：
 * mode=拆分模式（ranges=按页范围 / chunks=每 N 页 / single=单页逐个）；
 * pages=页范围文本（ranges 模式用，如 "1-3,5,8-10"）；
 * chunkSize=每份页数（chunks 模式用）。
 */
export const optionsSchema = z.object({
  mode: z.enum(['ranges', 'chunks', 'single']),
  pages: z.string().max(200, '页码范围取值过长'),
  chunkSize: z.string().max(10, '每份页数取值过长'),
})

export type PdfSplitOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
