import { z } from 'zod'

/** 选项契约：hue=色相旋转角度 -180..180（文本透传，组件内 parseHue 校验）；format=输出格式 */
export const optionsSchema = z.object({
  hue: z.string().max(10, '色相取值过长'),
  format: z.enum(['jpeg', 'png', 'webp']),
})

export type HueOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
