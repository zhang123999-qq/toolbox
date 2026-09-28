import { z } from 'zod'

/**
 * 输入契约：text=待校验地址（每行一个，支持批量）。
 * 合法性在 utils 层校验并抛中文错。
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 本工具无选项 */
export const optionsSchema = z.object({})

export type AddressValidateInput = z.infer<typeof inputSchema>
export type AddressValidateOptions = z.infer<typeof optionsSchema>
