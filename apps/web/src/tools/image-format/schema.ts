import { z } from 'zod'

/** 选项契约：本工具无用户选项，保留空对象以兼容模板 */
export const optionsSchema = z.object({})

export type ImageFormatOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（批量数量/单文件大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
