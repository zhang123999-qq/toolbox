import { z } from 'zod'

/** 选项契约：preset=滤镜预设；format=输出格式（默认 png） */
export const optionsSchema = z.object({
  preset: z.enum(['none', 'grayscale', 'sepia', 'invert', 'warm', 'cool', 'fade', 'vivid']),
  format: z.enum(['jpeg', 'png', 'webp']),
})

export type FilterOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
