import { z } from 'zod'

/** 选项契约：format=目标输出格式；quality=质量 1–100（仅 JPEG/WebP 有效；PNG 无损） */
export const optionsSchema = z.object({
  format: z.enum(['jpeg', 'png', 'webp']),
  quality: z.string().max(10, '质量取值过长'),
})

export type ImageConvertOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
