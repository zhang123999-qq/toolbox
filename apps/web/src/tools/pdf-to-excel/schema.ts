import { z } from 'zod'

/** 选项契约：sheetMode=工作表模式（merged 合并为一张表 / perPage 每页一张工作表） */
export const optionsSchema = z.object({
  sheetMode: z.enum(['merged', 'perPage']),
})

export type PdfToExcelOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
