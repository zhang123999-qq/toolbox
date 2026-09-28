import { z } from 'zod'

/** 选项契约：brightness=亮度 -100~100；contrast=对比度 -100~100；format=输出格式 */
export const optionsSchema = z.object({
  brightness: z.string().max(10, '亮度取值过长'),
  contrast: z.string().max(10, '对比度取值过长'),
  format: z.enum(['jpeg', 'png', 'webp']),
})

export type BrightnessContrastOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
