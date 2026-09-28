import { z } from 'zod'

/**
 * 选项契约：
 * mode=圆角 round / 圆形 circle；
 * radius=半径数值（字符串，number 输入框）；
 * radiusUnit=px / %（% 相对短边）；
 * background=transparent / white / custom；
 * customColor=自定义背景色（#rrggbb）；
 * format=输出格式 png / jpeg。
 */
export const optionsSchema = z.object({
  mode: z.enum(['round', 'circle']),
  radius: z.string().max(10, '半径取值过长'),
  radiusUnit: z.enum(['px', '%']),
  background: z.enum(['transparent', 'white', 'custom']),
  customColor: z.string().max(7, '颜色取值过长'),
  format: z.enum(['png', 'jpeg']),
})

export type ImageRoundOptions = z.infer<typeof optionsSchema>

/** 文件输入不经过 zod 文本校验，由组件内校验（类型/大小） */
export const inputSchema = z.object({
  fileName: z.string().max(255).optional(),
})
