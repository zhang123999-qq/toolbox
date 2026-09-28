import { z } from 'zod'

/**
 * 输入契约：text=私钥 hex（64 位，可带 0x 前缀），合法性由 utils 校验并抛中文错。
 * 本工具无选项。
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({})

export type PublicKeyInput = z.infer<typeof inputSchema>
export type PublicKeyOptions = z.infer<typeof optionsSchema>
