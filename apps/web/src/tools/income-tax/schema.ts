import { z } from 'zod'

/** 输入契约：text=月应纳税所得额（元），应已扣除 5000 起征点及专项扣除 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：本工具无选项 */
export const optionsSchema = z.object({})

export type IncomeTaxInput = z.infer<typeof inputSchema>
export type IncomeTaxOptions = z.infer<typeof optionsSchema>
