import { z } from 'zod'

/**
 * 输入契约：
 * text=雷达图数据行（「系列名, 指标1:值, 指标2:值…」，每行一个系列），留空用示例；
 * maxText=指标最大值（「指标1:最大值, 指标2:最大值…」），留空用示例。
 * 合法性在 utils 层校验并抛中文错。
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  maxText: z.string().max(200000, '指标最大值输入超过 200,000 字符上限'),
})

/** 选项契约：合法性在 utils 层校验并抛中文错 */
export const optionsSchema = z.object({
  title: z.string().max(60, '标题取值过长'),
  width: z.string().max(10, '宽度取值过长'),
  height: z.string().max(10, '高度取值过长'),
})

export type RadarInput = z.infer<typeof inputSchema>
export type RadarOptions = z.infer<typeof optionsSchema>
