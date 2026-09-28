import { z } from 'zod'

/** 选项契约：flatten=导出时是否拼合表单（字段变为静态内容，不可再编辑） */
export const optionsSchema = z.object({
  flatten: z.boolean(),
})

export type PdfFormOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
