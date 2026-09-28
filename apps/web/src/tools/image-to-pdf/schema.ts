import { z } from 'zod'

/** 选项契约：pageSize=页面尺寸（fit=适应图片，a4，letter）；margin=页边距 mm（字符串，0–50，空=0） */
export const optionsSchema = z.object({
  pageSize: z.enum(['fit', 'a4', 'letter']),
  margin: z.string().max(10, '页边距取值过长'),
})

export type ImageToPdfOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
