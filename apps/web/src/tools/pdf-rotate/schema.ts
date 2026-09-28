import { z } from 'zod'

/**
 * 选项契约：angle=顺时针旋转角度（90/180/270）；
 * scope=all 整文档 / pages 指定页面；pages=页范围文本（如 "1-3,5"，scope=pages 时有效）
 */
export const optionsSchema = z.object({
  angle: z.enum(['90', '180', '270']),
  scope: z.enum(['all', 'pages']),
  pages: z.string().max(100, '页范围取值过长'),
})

export type PdfRotateOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
