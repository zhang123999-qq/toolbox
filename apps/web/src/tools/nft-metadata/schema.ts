import { z } from 'zod'

/**
 * 输入契约：text=tokenId（非负整数）。
 * 选项：contract=ERC-721/1155 合约地址，rpcUrl=RPC 地址（可覆盖默认公共节点）。
 * 校验在 utils 层抛中文错。
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  contract: z.string(),
  rpcUrl: z.string(),
})

export type NftMetadataInput = z.infer<typeof inputSchema>
export type NftMetadataOptions = z.infer<typeof optionsSchema>
