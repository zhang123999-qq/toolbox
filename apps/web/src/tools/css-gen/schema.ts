import { z } from 'zod'

/** 输入契约：text=动画名称（可选，命中预设则覆盖 preset 选项；留空用 preset 选项） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：合法性在 utils 层校验并抛中文错 */
export const optionsSchema = z.object({
  preset: z.string().max(30, '预设取值过长'),
  duration: z.string().max(20, '时长取值过长'),
  timing: z.string().max(20, '缓动函数取值过长'),
  infinite: z.boolean(),
})

export type CssGenInput = z.infer<typeof inputSchema>
export type CssGenOptions = z.infer<typeof optionsSchema>
