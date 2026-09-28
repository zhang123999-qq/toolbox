import { z } from 'zod'

/**
 * 选项契约：本工具无用户可调选项（逐页提坐标文本 → 文本框 → .pptx 固定流程）；
 * 保留空对象契约以满足 catalog 校验。
 */
export const optionsSchema = z.object({})

export type PdfToPptOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小/加密） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
