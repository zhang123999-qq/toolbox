import { z } from 'zod'

/** 选项契约：count=提取颜色数量 3–10（文本输入，由 utils.parseColorCount 做范围校验） */
export const optionsSchema = z.object({
  count: z.string().max(10, '颜色数量取值过长'),
})

export type ColorExtractOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
