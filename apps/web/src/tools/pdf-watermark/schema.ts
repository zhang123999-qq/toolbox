import { z } from 'zod'

/** 水印类型：text=文字水印；image=图片水印 */
export const watermarkTypeSchema = z.enum(['text', 'image'])

/** 九宫格位置（行优先：上/中/下 × 左/中/右） */
export const watermarkPositionSchema = z.enum([
  'top-left',
  'top',
  'top-right',
  'left',
  'center',
  'right',
  'bottom-left',
  'bottom',
  'bottom-right',
])

/** 页面范围模式：all=全部页面；custom=按 pageRange 解析 */
export const pageModeSchema = z.enum(['all', 'custom'])

/**
 * 选项契约：数值类全部走字符串，由 utils.parse* 解析校验
 *（type=number 输入框的非法值用超范围数字触发，而非非数字字符串）。
 */
export const optionsSchema = z.object({
  watermarkType: watermarkTypeSchema,
  text: z.string().max(200, '水印文字过长'),
  fontSize: z.string().max(10, '字号取值过长'),
  color: z.string().max(20, '颜色取值过长'),
  opacity: z.string().max(10, '透明度取值过长'),
  rotate: z.string().max(10, '旋转角度取值过长'),
  position: watermarkPositionSchema,
  pageMode: pageModeSchema,
  pageRange: z.string().max(100, '页面范围过长'),
  scale: z.string().max(10, '缩放取值过长'),
})

export type PdfWatermarkOptions = z.infer<typeof optionsSchema>
export type WatermarkType = z.infer<typeof watermarkTypeSchema>
export type WatermarkPosition = z.infer<typeof watermarkPositionSchema>
export type PageMode = z.infer<typeof pageModeSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小/魔数） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
