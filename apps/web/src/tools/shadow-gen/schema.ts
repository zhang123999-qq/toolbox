import { z } from 'zod'

/** 输入契约：text=基础色（可选，彩色/霓虹样式的发光色），留空用默认色 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：合法性在 utils 层校验并抛中文错 */
export const optionsSchema = z.object({
  layers: z.string().max(10, '层数取值过长'),
  offsetX: z.string().max(20, '水平偏移取值过长'),
  offsetY: z.string().max(20, '垂直偏移取值过长'),
  blur: z.string().max(20, '模糊半径取值过长'),
  spread: z.string().max(20, '扩散半径取值过长'),
  color: z.string().max(60, '阴影颜色取值过长'),
  style: z.string().max(20, '阴影样式取值过长'),
})

export type ShadowGenInput = z.infer<typeof inputSchema>
export type ShadowGenOptions = z.infer<typeof optionsSchema>
