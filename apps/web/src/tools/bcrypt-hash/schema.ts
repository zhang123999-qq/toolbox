import { z } from 'zod'

/** 输入契约：text 是口令（哈希时）或口令 + 待校验哈希（校验时） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  hash: z.string(),
})

/** 选项契约：cost 是 2^cost 轮扩展，越大越慢 */
export const optionsSchema = z.object({
  direction: z.union([z.literal('hash'), z.literal('verify')]),
  cost: z.union([z.literal('4'), z.literal('6'), z.literal('8'), z.literal('10'), z.literal('12')]),
})

export type BcryptInput = z.infer<typeof inputSchema>
export type BcryptOptions = z.infer<typeof optionsSchema>
