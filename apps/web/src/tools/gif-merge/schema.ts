import { z } from 'zod'

/**
 * 选项契约：
 * delay=帧延迟毫秒（全局统一，20–10000）；repeat=循环次数（0=无限循环，0–100）；
 * quality=gif.js 像素采样间隔（1–20，越小越清晰）。
 * 文本输入由 utils 的 parse* 函数做范围校验，这里只做长度上限。
 */
export const optionsSchema = z.object({
  delay: z.string().max(10, '延迟取值过长'),
  repeat: z.string().max(10, '循环次数取值过长'),
  quality: z.string().max(10, '质量取值过长'),
})

export type GifMergeOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小/帧数） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
