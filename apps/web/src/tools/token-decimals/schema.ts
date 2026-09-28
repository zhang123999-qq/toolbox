import { z } from 'zod'

/**
 * 输入契约：text=待换算数值（十进制，可带千分位逗号）。
 * 选项：fromUnit/toUnit=源/目标单位（wei/gwei/ether/自定义），
 * customFrom/customTo=自定义时的 decimals。数值校验在 utils 层抛中文错。
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  fromUnit: z.string(),
  toUnit: z.string(),
  customFrom: z.string(),
  customTo: z.string(),
})

export type TokenDecimalsInput = z.infer<typeof inputSchema>
export type TokenDecimalsOptions = z.infer<typeof optionsSchema>
