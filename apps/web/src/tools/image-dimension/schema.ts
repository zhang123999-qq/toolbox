import { z } from 'zod'

/**
 * 选项契约：
 * width/height=目标宽高（像素，1–16384 的整数文本）；
 * fit=适配模式（contain 等比留白 / cover 等比裁剪 / stretch 拉伸）；
 * bgColor=留白背景色（#rrggbb 或 #rgb，仅 contain 生效）；
 * format=输出格式；quality=质量 1–100（仅 jpeg/webp 有效）。
 * 预设下拉是 UI 糖，最终只写入 width/height，不进契约。
 */
export const optionsSchema = z.object({
  width: z.string().max(10, '宽度取值过长'),
  height: z.string().max(10, '高度取值过长'),
  fit: z.enum(['contain', 'cover', 'stretch']),
  bgColor: z.string().max(20, '背景色取值过长'),
  format: z.enum(['jpeg', 'png', 'webp']),
  quality: z.string().max(10, '质量取值过长'),
})

export type ImageDimensionOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
