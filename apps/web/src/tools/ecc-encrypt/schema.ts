import { z } from 'zod'

/** 输入契约：text 仅作生成密钥的触发；协商时用双方密钥 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  publicKey: z.string(),
  privateKey: z.string(),
})

/** 选项契约：generate 生成密钥对，derive 用「己方私钥 + 对方公钥」推导共享密钥 */
export const optionsSchema = z.object({
  direction: z.union([z.literal('derive'), z.literal('generate')]),
  curve: z.union([z.literal('P-256'), z.literal('P-384'), z.literal('P-521')]),
  encoding: z.union([z.literal('base64'), z.literal('hex')]),
})

export type EccInput = z.infer<typeof inputSchema>
export type EccOptions = z.infer<typeof optionsSchema>
