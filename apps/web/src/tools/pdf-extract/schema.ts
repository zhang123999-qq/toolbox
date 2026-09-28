import { z } from 'zod'

/**
 * 输入契约：PDF 走左下文件入口，text 文本区保留为空即可。
 * 提取逻辑在 Tool.tsx 的 onFile 里，schema 只做占位。
 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 本工具无选项 */
export const optionsSchema = z.object({})

export type PdfExtractInput = z.infer<typeof inputSchema>
export type PdfExtractOptions = z.infer<typeof optionsSchema>
