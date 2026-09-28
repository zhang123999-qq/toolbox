import { z } from 'zod'

/** 选项契约：本工具无用户选项（逐页全量提取），保留空对象以符合模板结构 */
export const optionsSchema = z.object({})

export type PdfToTextOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
