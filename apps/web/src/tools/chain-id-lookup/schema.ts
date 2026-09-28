import { z } from 'zod'

/** 输入契约：text=链 ID / 名称 / 代币符号查询串 */
export const inputSchema = z.object({
  text: z.string().max(100, '查询串超过 100 字符上限'),
})

export const optionsSchema = z.object({})

export type ChainIdLookupInput = z.infer<typeof inputSchema>
export type ChainIdLookupOptions = z.infer<typeof optionsSchema>
