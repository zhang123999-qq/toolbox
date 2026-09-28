import { z } from 'zod'

/**
 * 选项契约：
 * direction=布局（horizontal 横向 / vertical 纵向 / grid 网格）；
 * columns=网格列数 1–10；gap=子图间距 px 0–100；
 * format=输出格式（png 默认，保留透明 / jpeg）；
 * quality=质量 1–100（仅 jpeg 有效）。
 */
export const optionsSchema = z.object({
  direction: z.enum(['horizontal', 'vertical', 'grid']),
  columns: z.string().max(10, '列数取值过长'),
  gap: z.string().max(10, '间距取值过长'),
  format: z.enum(['png', 'jpeg']),
  quality: z.string().max(10, '质量取值过长'),
})

export type SpriteGenOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内逐张校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
