import { z } from 'zod'

/** 选项契约：saturation=饱和度 0–200（100=原图）；format=输出格式 */
export const optionsSchema = z.object({
  saturation: z.string().max(10, '饱和度取值过长'),
  format: z.enum(['jpeg', 'png', 'webp']),
})

export type SaturationOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
