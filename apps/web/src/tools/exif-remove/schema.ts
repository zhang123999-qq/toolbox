import { z } from 'zod'

/** 选项契约：format=输出格式（jpeg/png） */
export const optionsSchema = z.object({
  format: z.enum(['jpeg', 'png']),
})

export type ExifRemoveOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
