import { z } from 'zod'

/**
 * 选项契约：mode=抠除模式（edge=边缘抠除，chroma=色度键）；
 * tolerance=容差 0–100（字符串输入，解析见 utils.parseTolerance）；
 * targetColor=色度键目标颜色（#rrggbb，仅 chroma 模式使用）。
 */
export const optionsSchema = z.object({
  mode: z.enum(['edge', 'chroma']),
  tolerance: z.string().max(10, '容差取值过长'),
  targetColor: z.string().max(20, '颜色取值过长'),
})

export type BackgroundRemoveOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
