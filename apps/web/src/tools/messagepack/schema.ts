import { z } from 'zod'

/**
 * 输入契约：
 * - 编码模式：JSON 文本
 * - 解码模式：MessagePack 字节串（十六进制或 base64）
 */
export const inputSchema = z.object({
  text: z.string().max(500_000, '输入超过 500,000 字符上限'),
})

/** 选项契约：mode 决定方向；format 决定字节串的展示形式 */
export const optionsSchema = z.object({
  mode: z.union([z.literal('encode'), z.literal('decode')]),
  format: z.union([z.literal('hex'), z.literal('base64')]),
})

export type MessagePackInput = z.infer<typeof inputSchema>
export type MessagePackOptions = z.infer<typeof optionsSchema>
