import { z } from 'zod'

/**
 * 选项契约：range=按范围快速勾选的输入（"1,3,5-7"），空串=不执行。
 * 选中页码由组件状态管理，不入 schema。
 */
export const optionsSchema = z.object({
  range: z.string().max(100, '范围输入过长'),
})

export type PdfDeleteOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
