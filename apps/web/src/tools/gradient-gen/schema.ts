import { z } from 'zod'

/** 输入契约：text=颜色列表（每行一个 #rrggbb，留空=随机 2–4 色） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：合法性在 utils 层校验并抛中文错 */
export const optionsSchema = z.object({
  type: z.string().max(20, '渐变类型取值过长'),
  angle: z.string().max(20, '角度取值过长'),
  shape: z.string().max(20, '径向形状取值过长'),
})

export type GradientGenInput = z.infer<typeof inputSchema>
export type GradientGenOptions = z.infer<typeof optionsSchema>
