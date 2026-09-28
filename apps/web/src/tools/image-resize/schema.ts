import { z } from 'zod'

/**
 * 选项契约：mode=像素(pixel)|百分比(percent)；width/height=目标像素（空串=未填）；
 * percent=缩放百分比；lock=是否锁定纵横比（'true'|'false'）；
 * format=输出格式；quality=质量 1–100（仅 JPEG/WebP 有效）
 */
export const optionsSchema = z.object({
  mode: z.string(),
  width: z.string().max(10, '宽度取值过长'),
  height: z.string().max(10, '高度取值过长'),
  percent: z.string().max(10, '百分比取值过长'),
  lock: z.string(),
  format: z.enum(['jpeg', 'png', 'webp']),
  quality: z.string().max(10, '质量取值过长'),
})

export type ImageResizeOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
