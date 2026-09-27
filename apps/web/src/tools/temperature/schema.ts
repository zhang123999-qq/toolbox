import { z } from 'zod'

/** 输入契约：text=待换算的温度数值 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：from=源单位，to=目标单位，取值 C / F / K */
export const optionsSchema = z.object({
  from: z.string(),
  to: z.string(),
})

export type TemperatureInput = z.infer<typeof inputSchema>
export type TemperatureOptions = z.infer<typeof optionsSchema>
