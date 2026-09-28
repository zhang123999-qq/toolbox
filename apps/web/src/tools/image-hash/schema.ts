import { z } from 'zod'

/** 选项契约：本工具无用户可调选项，空对象 */
export const optionsSchema = z.object({})

export type ImageHashOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
