import { z } from 'zod'

/**
 * 输入契约：text=调用参数 JSON 数组（如 ["0xabc...", 100]），可为空（无参方法）。
 * 选项：contract=合约地址，abi=ABI JSON，method=方法名，rpcUrl=RPC 地址。
 * 校验在 utils 层抛中文错。
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  contract: z.string(),
  abi: z.string(),
  method: z.string(),
  rpcUrl: z.string(),
})

export type ContractSimInput = z.infer<typeof inputSchema>
export type ContractSimOptions = z.infer<typeof optionsSchema>
