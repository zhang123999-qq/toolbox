import { z } from 'zod'

/**
 * 选项契约：text=水印文字（去空白后不能为空）；fontSize=字号 px（8–500 整数）；
 * color=#rrggbb 颜色；opacity=不透明度 0–100；position=九宫格位置；
 * angle=旋转角度 -180–180（可小数）；tile=整图平铺；margin=边距 px（0–500）；
 * format=输出格式；quality=质量 1–100（仅 JPEG/WebP 有效）。
 * 数值选项一律用 string 承载，由 utils 侧解析校验。
 */
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

export const optionsSchema = z.object({
  text: z.string().max(500, '水印文字过长'),
  fontSize: z.string().max(10, '字号取值过长'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, '颜色格式无效'),
  opacity: z.string().max(10, '不透明度取值过长'),
  position: z.enum(POSITIONS),
  angle: z.string().max(10, '角度取值过长'),
  tile: z.boolean(),
  margin: z.string().max(10, '边距取值过长'),
  format: z.enum(['jpeg', 'png', 'webp']),
  quality: z.string().max(10, '质量取值过长'),
})

export type WatermarkOptions = z.infer<typeof optionsSchema>
export type WatermarkPosition = (typeof POSITIONS)[number]

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
