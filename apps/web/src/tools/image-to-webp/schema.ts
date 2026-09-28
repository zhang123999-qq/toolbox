import { z } from 'zod'

/** 选项契约：quality=WebP 质量 1–100；maxDimension=最大边像素上限（0=不限） */
export const optionsSchema = z.object({
  quality: z.string().max(10, '质量取值过长'),
  maxDimension: z.string().max(10, '尺寸取值过长'),
})

export type ImageToWebpOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
