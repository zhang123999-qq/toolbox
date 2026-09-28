import { z } from 'zod'

/**
 * 选项契约：合并顺序由文件列表的上移/下移维护，不需要额外的表单选项；
 * 保留空对象契约以满足 catalog 校验。
 */
export const optionsSchema = z.object({})

export type PdfMergeOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内逐文件校验（类型/大小/加密） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
