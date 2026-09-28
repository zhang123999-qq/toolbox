import { z } from 'zod'

/** 选项契约：pixelSize=像素块大小 2–64（字符串，由组件内 parsePixelSize 校验）；format=输出格式 */
export const optionsSchema = z.object({
  pixelSize: z.string().max(10, '像素块大小取值过长'),
  format: z.enum(['jpeg', 'png', 'webp']),
})

export type PixelateOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
