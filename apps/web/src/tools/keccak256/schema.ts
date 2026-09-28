import { z } from 'zod'

/**
 * 输入契约：text 为待哈希内容（文本或 hex）。
 * 选项：inputKind 决定按 UTF-8 文本还是 hex 解析；format 决定输出 hex 或 Base64。
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  inputKind: z.union([z.literal('text'), z.literal('hex')]),
  format: z.union([z.literal('hex'), z.literal('base64')]),
})

export type Keccak256Input = z.infer<typeof inputSchema>
export type Keccak256Options = z.infer<typeof optionsSchema>
