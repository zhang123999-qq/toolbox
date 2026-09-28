import { z } from 'zod'

/** 输入契约：text 保留（本工具图案由选项决定，留空即可） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：合法性在 utils 层校验并抛中文错 */
export const optionsSchema = z.object({
  pattern: z.string().max(20, '图案取值过长'),
  width: z.string().max(10, '宽度取值过长'),
  height: z.string().max(10, '高度取值过长'),
  fgColor: z.string().max(20, '前景色取值过长'),
  bgColor: z.string().max(20, '背景色取值过长'),
  spacing: z.string().max(10, '间距取值过长'),
})

export type SvgGenInput = z.infer<typeof inputSchema>
export type SvgGenOptions = z.infer<typeof optionsSchema>
