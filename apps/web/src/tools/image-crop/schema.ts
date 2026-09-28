import { z } from 'zod'

/** 选项契约：aspectRatio=纵横比预设；x/y/width/height=裁剪矩形像素值（数字输入框的值，用 string）；format=输出格式；quality=质量 1–100（仅 JPEG/WebP 有效） */
export const optionsSchema = z.object({
  aspectRatio: z.enum(['free', '1:1', '4:3', '3:4', '16:9', '9:16']),
  x: z.string().max(10, '裁剪取值过长'),
  y: z.string().max(10, '裁剪取值过长'),
  width: z.string().max(10, '裁剪取值过长'),
  height: z.string().max(10, '裁剪取值过长'),
  format: z.enum(['jpeg', 'png', 'webp']),
  quality: z.string().max(10, '质量取值过长'),
})

export type ImageCropOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
