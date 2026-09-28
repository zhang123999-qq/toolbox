import { z } from 'zod'

/** 输入契约：输入框只作触发用（内容不参与生成），上限按通用文本口径 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/**
 * 选项契约：length 为字符串数字（T2 文本框取值），合法性由 utils 校验并抛中文错；
 * 其余为布尔开关（T2 复选框直接给 boolean）。
 */
export const optionsSchema = z.object({
  length: z.string().max(10, '长度取值过长'),
  includeUpper: z.boolean(),
  includeLower: z.boolean(),
  includeNumbers: z.boolean(),
  includeSymbols: z.boolean(),
  noAmbiguous: z.boolean(),
})

export type RandomPasswordInput = z.infer<typeof inputSchema>
export type RandomPasswordOptions = z.infer<typeof optionsSchema>
