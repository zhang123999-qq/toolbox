import { z } from 'zod'

/**
 * 选项契约：temperature=色温 -100–100（默认 0；负冷蓝、正暖黄）；
 * tint=色调 -100–100（默认 0；负偏绿、正偏品红）；
 * exposure=曝光 -100–100（默认 0；负压暗、正提亮）；
 * format=输出格式。数值走字符串，由 utils.parseColorValue 校验。
 */
export const optionsSchema = z.object({
  temperature: z.string().max(10, '色温取值过长'),
  tint: z.string().max(10, '色调取值过长'),
  exposure: z.string().max(10, '曝光取值过长'),
  format: z.enum(['jpeg', 'png', 'webp']),
})

export type ColorAdjustOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
