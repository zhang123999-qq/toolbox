import { z } from 'zod'

/** 快捷旋转预设（顺时针）：点击后直接把统一角度设为该值（批量版不做累加） */
export const ANGLE_PRESETS = [90, 180, 270] as const

/** 选项契约：angle=统一旋转角度（-360~360，由 utils.parseAngle 解析）；format=输出格式；quality=质量 1–100（仅 JPEG/WebP 有效） */
export const optionsSchema = z.object({
  angle: z.string().max(10, '角度取值过长'),
  format: z.enum(['jpeg', 'png', 'webp']),
  quality: z.string().max(10, '质量取值过长'),
})

export type RotateBatchOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
