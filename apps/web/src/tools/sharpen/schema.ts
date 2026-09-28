import { z } from 'zod'

/** 选项契约：strength=锐化强度 0–100（整数，文本框输入）；format=输出格式 */
export const optionsSchema = z.object({
  format: z.enum(['jpeg', 'png', 'webp']),
  strength: z.string().max(10, '强度取值过长'),
})

export type SharpenOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
