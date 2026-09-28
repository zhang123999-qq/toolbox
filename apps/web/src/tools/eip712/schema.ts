import { z } from 'zod'

/**
 * 输入契约：text 为 EIP-712 TypedData JSON：
 * { types, domain, primaryType, message }。
 * 解析与类型校验在 utils 层抛中文错。
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({})

export type Eip712Input = z.infer<typeof inputSchema>
export type Eip712Options = z.infer<typeof optionsSchema>
