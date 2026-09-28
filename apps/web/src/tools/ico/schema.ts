import { z } from 'zod'

/** 选项契约：sizes=要包含的尺寸（px 边长，字符串数组，来自 checkbox 组） */
export const optionsSchema = z.object({
  sizes: z.array(z.string()),
})

export type IcoOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
