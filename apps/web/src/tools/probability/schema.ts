import { z } from 'zod'

/** 输入契约：text=每行一个「key=value」参数（所需 key 取决于 mode） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：计算模式 / 小数位数 */
export const optionsSchema = z.object({
  mode: z.enum(['binomial', 'conditional', 'normal']).default('binomial'),
  decimals: z.enum(['0', '1', '2', '4', '6', '8']).default('6'),
})

export type ProbabilityInput = z.infer<typeof inputSchema>
export type ProbabilityOptions = z.infer<typeof optionsSchema>
