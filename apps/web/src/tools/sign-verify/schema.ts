import { z } from 'zod'

/**
 * 输入契约：text=私钥 hex（签名模式）/ 签名 hex（验签模式）；
 * message=待签消息，address=待比对地址（验签模式）。
 * 选项：mode=签名/验签。校验在 utils 层抛中文错。
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  message: z.string().max(200000, '消息超过 200,000 字符上限'),
  address: z.string(),
})

export const optionsSchema = z.object({
  mode: z.string(),
})

export type SignVerifyInput = z.infer<typeof inputSchema>
export type SignVerifyOptions = z.infer<typeof optionsSchema>
