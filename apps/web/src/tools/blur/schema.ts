import { z } from 'zod'

/** 选项契约：radius=模糊半径 0–50（px）；format=输出格式 */
export const optionsSchema = z.object({
  radius: z.string().max(10, '半径取值过长'),
  format: z.enum(['jpeg', 'png', 'webp']),
})

export type BlurOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
