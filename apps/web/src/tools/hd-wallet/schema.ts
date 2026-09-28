import { z } from 'zod'

/**
 * 输入契约：text=种子（hex，16–64 字节，可用 #702 助记词「转种子」得到）。
 * 选项：path=基础路径，from/to=地址序号范围（含两端，最多 20 个）。
 * 校验在 utils 层抛中文错。
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  path: z.string(),
  from: z.string(),
  to: z.string(),
})

export type HdWalletInput = z.infer<typeof inputSchema>
export type HdWalletOptions = z.infer<typeof optionsSchema>
