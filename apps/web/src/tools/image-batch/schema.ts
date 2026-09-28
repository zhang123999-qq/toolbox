import { z } from 'zod'

/** 选项契约：format=输出格式；quality=质量 1–100（仅 JPEG/WebP 有效）；maxDimension=最大边像素上限（0=不限） */
export const optionsSchema = z.object({
  format: z.enum(['jpeg', 'png', 'webp']),
  quality: z.string().max(10, '质量取值过长'),
  maxDimension: z.string().max(10, '尺寸取值过长'),
})

export type ImageBatchOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小/数量） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
