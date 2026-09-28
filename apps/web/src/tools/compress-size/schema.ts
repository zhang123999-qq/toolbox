import { z } from 'zod'

/**
 * 选项契约：format=输出格式（仅 jpeg/webp；PNG 无质量参数无法二分）；
 * targetSize=目标大小 KB 字符串，由 utils.parseTargetSize 解析校验。
 */
export const optionsSchema = z.object({
  format: z.enum(['jpeg', 'webp']),
  targetSize: z.string().max(10, '目标大小取值过长'),
})

export type CompressSizeOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
