import { z } from 'zod'

/** 选项契约：页面顺序完全由界面列表交互维护，无文本选项 */
export const optionsSchema = z.object({})

export type PdfSortOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小/页数） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
