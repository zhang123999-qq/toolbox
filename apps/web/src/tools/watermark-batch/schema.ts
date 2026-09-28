import { z } from 'zod'

/** 九宫格位置（顺序即下拉展示顺序：上→中→下，左→中→右） */
export const POSITIONS = [
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'center',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
] as const

export type WatermarkBatchPosition = (typeof POSITIONS)[number]

/**
 * 选项契约：数字类一律用 string，由 utils 解析校验；
 * text 上限 100 字；tile 为布尔开关；format 输出格式；quality 质量 1–100。
 */
export const optionsSchema = z.object({
  text: z.string().max(100, '水印文字过长（上限 100 字）'),
  position: z.enum(POSITIONS),
  fontSize: z.string().max(10, '字号取值过长'),
  color: z.string().max(10, '颜色取值过长'),
  opacity: z.string().max(10, '不透明度取值过长'),
  angle: z.string().max(10, '角度取值过长'),
  tile: z.boolean(),
  format: z.enum(['jpeg', 'png', 'webp']),
  quality: z.string().max(10, '质量取值过长'),
})

export type WatermarkBatchOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小/数量） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
