import { z } from 'zod'

/** 本工具无选项 */
export const optionsSchema = z.object({})

export type QrScanOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
