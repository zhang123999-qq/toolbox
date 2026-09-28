import { z } from 'zod'

/** 选项契约：dpi=渲染分辨率；pages=页码选择（"all" 或 "1,3,5-7"）；format=输出格式 */
export const optionsSchema = z.object({
  dpi: z.enum(['72', '150', '300']),
  pages: z.string().max(50),
  format: z.enum(['png', 'jpeg']),
})

export type PdfToImageOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
