import { z } from 'zod'

/**
 * 选项契约：rows/cols=行列数（1–10，默认 3）；format=输出格式；
 * quality=质量 1–100（默认 90，仅 JPEG/WebP 有效）。
 * 数字字段以字符串形式走表单，合法性由 utils 的 parse 函数校验。
 */
export const optionsSchema = z.object({
  rows: z.string().max(10, '行数取值过长'),
  cols: z.string().max(10, '列数取值过长'),
  format: z.enum(['jpeg', 'png', 'webp']),
  quality: z.string().max(10, '质量取值过长'),
})

export type GridImageOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
