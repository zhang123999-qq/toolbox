import { z } from 'zod'

/** 输入契约：text=待换算金额；apiKey=用户自备的汇率接口 Key（页面密码框填写） */
export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20,000 字符上限'),
  apiKey: z.string().max(500, 'API Key 超过 500 字符上限'),
})

/** 选项契约：from=源货币代码，to=目标货币代码（ISO 4217） */
export const optionsSchema = z.object({
  from: z.string(),
  to: z.string(),
})

export type ExchangeRateInput = z.infer<typeof inputSchema>
export type ExchangeRateOptions = z.infer<typeof optionsSchema>
