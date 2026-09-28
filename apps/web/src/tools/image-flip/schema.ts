import { z } from 'zod'

/**
 * 选项契约：
 * flipH=水平翻转复选框，flipV=垂直翻转复选框（至少其一为 true，由 utils.parseFlipOptions 校验）；
 * format=输出格式；quality=质量 1–100（仅 JPEG/WebP 有效）。
 */
export const optionsSchema = z.object({
  flipH: z.boolean(),
  flipV: z.boolean(),
  format: z.enum(['jpeg', 'png', 'webp']),
  quality: z.string().max(10, '质量取值过长'),
})

export type ImageFlipOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
