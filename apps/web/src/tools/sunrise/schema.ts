import { z } from 'zod'

/** 输入契约：多行键值文本（日期/纬度/经度/时区），上限按通用文本口径 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：日出日落无开关（所有参数都在输入文本里），保留空对象占位 */
export const optionsSchema = z.object({})

export type SunriseInput = z.infer<typeof inputSchema>
export type SunriseOptions = z.infer<typeof optionsSchema>
