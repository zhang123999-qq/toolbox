import { z } from 'zod'

/** 输入契约：text=一组数字，空白 / 逗号 / 分号分隔 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：decimals=结果保留小数位数 */
export const optionsSchema = z.object({
  decimals: z.enum(['0', '1', '2', '4', '6', '10']).default('4'),
})

export type MedianInput = z.infer<typeof inputSchema>
export type MedianOptions = z.infer<typeof optionsSchema>
