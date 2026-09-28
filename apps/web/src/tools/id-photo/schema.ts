import { z } from 'zod'

/** 证件照规格：1inch 一寸 25×35mm；2inch 二寸 35×49mm；small2inch 小二寸 35×45mm；large1inch 大一寸 33×48mm；custom 自定义 */
export const specKeySchema = z.enum(['1inch', '2inch', 'small2inch', 'large1inch', 'custom'])
export type SpecKey = z.infer<typeof specKeySchema>

/** 底色模式：red 红 / blue 蓝 / white 白 / custom 自定义颜色 */
export const bgColorModeSchema = z.enum(['red', 'blue', 'white', 'custom'])
export type BgColorMode = z.infer<typeof bgColorModeSchema>

/** 排版：single 单张；5inch 5寸相纸 127×89mm；a4 A4 210×297mm */
export const layoutKeySchema = z.enum(['single', '5inch', 'a4'])
export type LayoutKey = z.infer<typeof layoutKeySchema>

/**
 * 选项契约：spec=规格；customW/customH=自定义宽高（mm）；dpi=分辨率；
 * scale=缩放 50–200（%）；bgColorMode=底色模式；customBg=自定义底色；
 * layout=排版。
 */
export const optionsSchema = z.object({
  spec: specKeySchema,
  customW: z.string().max(10, '宽度取值过长'),
  customH: z.string().max(10, '高度取值过长'),
  dpi: z.string().max(10, 'DPI 取值过长'),
  scale: z.string().max(10, '缩放取值过长'),
  bgColorMode: bgColorModeSchema,
  customBg: z.string().max(20, '颜色取值过长'),
  layout: layoutKeySchema,
})

export type IdPhotoOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
