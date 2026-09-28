import { z } from 'zod'

/**
 * 选项契约：
 * colors=颜色数 2–8（海报化分层）；maxEdge=最大边 64–1024（下采样精度）；
 * minArea=最小色块面积 px²（过滤噪点）；keepBackground=是否保留背景层
 * （off=丢弃最浅色层，使背景透明）。
 */
export const optionsSchema = z.object({
  colors: z.string().max(10, '颜色数取值过长'),
  maxEdge: z.string().max(10, '最大边取值过长'),
  minArea: z.string().max(10, '最小色块取值过长'),
  keepBackground: z.enum(['on', 'off']),
})

export type PngToSvgOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
