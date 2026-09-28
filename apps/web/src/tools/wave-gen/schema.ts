import { z } from 'zod'

/** 输入契约：text=种子文本（可选，相同文本+参数生成相同波浪），留空随机 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：合法性在 utils 层校验并抛中文错 */
export const optionsSchema = z.object({
  amplitude: z.string().max(10, '振幅取值过长'),
  frequency: z.string().max(10, '频率取值过长'),
  layers: z.string().max(10, '层数取值过长'),
  color1: z.string().max(20, '起始色取值过长'),
  color2: z.string().max(20, '结束色取值过长'),
})

export type WaveGenInput = z.infer<typeof inputSchema>
export type WaveGenOptions = z.infer<typeof optionsSchema>
