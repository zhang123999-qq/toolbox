import { z } from 'zod'

/**
 * 输入契约：text=查询内容（地址 / 交易哈希 / 区块号）。
 * 选项：kind=查询类型（余额查询/交易查询/区块查询），rpcUrl=RPC 地址
 * （可覆盖默认公共节点）。校验在 utils 层抛中文错。
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  kind: z.string(),
  rpcUrl: z.string(),
})

export type ChainQueryInput = z.infer<typeof inputSchema>
export type ChainQueryOptions = z.infer<typeof optionsSchema>
