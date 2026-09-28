import { z } from 'zod'

/** 输入契约：本工具不使用 text（纯随机生成），保留以匹配模板 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入过长'),
})

/** 选项契约：length / charset 合法性在 utils 校验；noAmbiguous 为布尔开关 */
export const optionsSchema = z.object({
  length: z.string().max(10, '长度过长'),
  charset: z.string().max(20, '字符集过长'),
  noAmbiguous: z.boolean(),
})

export type CaptchaInput = z.infer<typeof inputSchema>
export type CaptchaOptions = z.infer<typeof optionsSchema>
