import { z } from 'zod'

/** 输入契约：输入框只作触发用（内容不参与生成），上限仍按通用文本口径 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：长度用字符串字面量，和 T2 模板的 select 取值保持一致 */
export const optionsSchema = z.object({
  length: z.union([
    z.literal('8'),
    z.literal('12'),
    z.literal('16'),
    z.literal('24'),
    z.literal('32'),
  ]),
  noAmbiguous: z.boolean(),
  eachClass: z.boolean(),
  includeLower: z.boolean(),
  includeUpper: z.boolean(),
  includeNumbers: z.boolean(),
  includeSymbols: z.boolean(),
})

export type PasswordInput = z.infer<typeof inputSchema>
export type PasswordOptions = z.infer<typeof optionsSchema>
