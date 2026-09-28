import { z } from 'zod'

/** 选项契约：blockSize=马赛克块大小（像素，4–64）；format=输出格式 */
export const optionsSchema = z.object({
  blockSize: z.string().max(10, '块大小取值过长'),
  format: z.enum(['jpeg', 'png', 'webp']),
})

export type MosaicOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
