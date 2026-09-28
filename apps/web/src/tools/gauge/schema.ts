import { z } from 'zod'

/**
 * 输入契约：text 保留占位；value=当前值、min=最小值、max=最大值（Tool 以 extraInputs 呈现）。
 * 选项契约：title/width/height；合法性在 utils 层校验并抛中文错。
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  value: z.string().max(20, '当前值取值过长'),
  min: z.string().max(20, '最小值取值过长'),
  max: z.string().max(20, '最大值取值过长'),
})

export const optionsSchema = z.object({
  title: z.string().max(60, '标题取值过长'),
  width: z.string().max(10, '宽度取值过长'),
  height: z.string().max(10, '高度取值过长'),
})

export type GaugeInput = z.infer<typeof inputSchema>
export type GaugeOptions = z.infer<typeof optionsSchema>
