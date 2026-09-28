import { z } from 'zod'

/** 输入契约：text=组件名称；options.type=组件类型；其余为可选参数 */
export const inputSchema = z.object({
  text: z.string().max(100, '组件名称超过 100 字符上限'),
})

export const optionsSchema = z.object({
  type: z.string().max(20, '组件类型取值过长'),
  id: z.string().max(60, 'id 超过 60 字符上限'),
  describedBy: z.string().max(60, 'describedBy 超过 60 字符上限'),
  min: z.string().max(20, '最小值取值过长'),
  max: z.string().max(20, '最大值取值过长'),
  value: z.string().max(20, '当前值取值过长'),
})

export type AriaGenInput = z.infer<typeof inputSchema>
export type AriaGenOptions = z.infer<typeof optionsSchema>
