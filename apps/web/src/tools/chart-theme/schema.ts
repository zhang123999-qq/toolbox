import { z } from 'zod'

/**
 * 输入契约：
 * text=预览图表标题，留空无标题。
 * 合法性在 utils 层校验并抛中文错。
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：合法性在 utils 层校验并抛中文错 */
export const optionsSchema = z.object({
  background: z.string().max(20, '背景色取值过长'),
  palette: z.string().max(500, '主色板取值过长'),
  fontFamily: z.string().max(120, '字体取值过长'),
  titleSize: z.string().max(10, '标题字号取值过长'),
})

export type ChartThemeInput = z.infer<typeof inputSchema>
export type ChartThemeOptions = z.infer<typeof optionsSchema>
