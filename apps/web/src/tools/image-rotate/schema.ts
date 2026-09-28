import { z } from 'zod'

/**
 * 选项契约：angle=旋转角度 -360~360（字符串，空=0）；format=输出格式；
 * quality=质量 1–100（仅 JPEG/WebP 有效）；backgroundColor=背景填充色；
 * transparent=PNG 透明背景开关（仅 format=png 时有效）
 */
export const optionsSchema = z.object({
  angle: z.string().max(10, '角度取值过长'),
  format: z.enum(['jpeg', 'png', 'webp']),
  quality: z.string().max(10, '质量取值过长'),
  backgroundColor: z.string().max(7, '颜色取值过长'),
  transparent: z.boolean(),
})

export type ImageRotateOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
