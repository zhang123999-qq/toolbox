import { z } from 'zod'

/** 输入契约：基准日期字符串 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：操作方向 + 数量 + 单位 */
export const optionsSchema = z.object({
  op: z.union([z.literal('add'), z.literal('subtract')]),
  amount: z.string(),
  unit: z.union([
    z.literal('year'),
    z.literal('month'),
    z.literal('week'),
    z.literal('day'),
    z.literal('hour'),
    z.literal('minute'),
    z.literal('second'),
  ]),
})

export type DateCalcInput = z.infer<typeof inputSchema>
export type DateCalcOptions = z.infer<typeof optionsSchema>
