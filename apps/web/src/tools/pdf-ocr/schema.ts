import { z } from 'zod'

/** 选项契约：语言复选框用 '1'（选中）/ ''（未选）字符串；至少选一种由 parseLangs 校验 */
export const optionsSchema = z.object({
  chiSim: z.string().max(5),
  eng: z.string().max(5),
})

export type PdfOcrOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（大小/魔数） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
