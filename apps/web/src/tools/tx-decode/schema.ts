import { z } from 'zod'

/**
 * 输入契约：text=原始交易 hex（可带 0x 前缀，可含换行/空格）。
 * RLP 非法、类型不支持、字段缺失均在 utils 层抛中文错。
 * 本工具无选项。
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({})

export type TxDecodeInput = z.infer<typeof inputSchema>
export type TxDecodeOptions = z.infer<typeof optionsSchema>
