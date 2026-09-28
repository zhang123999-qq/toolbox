import { z } from 'zod'

/**
 * 选项契约：
 * widthMode=宽度模式：uniform 以最宽图为准统一宽度（其余等比缩放）/
 *           original 保持原尺寸（画布宽=最宽图，窄图按 align 放置）
 * align=original 模式下窄图的水平对齐：left/center/right
 * gap=图之间间距像素（0–200）
 * bgColor=画布背景色（#rrggbb）
 * format=输出格式；quality=质量 1–100（仅 JPEG/WebP 有效，PNG 不生效）
 */
export const optionsSchema = z.object({
  widthMode: z.enum(['uniform', 'original']),
  align: z.enum(['left', 'center', 'right']),
  gap: z.string().max(10, '间距取值过长'),
  bgColor: z.string().max(20, '颜色取值过长'),
  format: z.enum(['jpeg', 'png', 'webp']),
  quality: z.string().max(10, '质量取值过长'),
})

export type LongImageOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内逐张校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
