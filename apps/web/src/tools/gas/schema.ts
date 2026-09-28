import { z } from 'zod'

/**
 * 输入契约：text=Gas Price（gwei，十进制），计算器模式用；实时查询模式可为空。
 * 选项：mode=计算器/实时查询，gasLimit=手动 Gas Limit，preset=常用预设，
 * rpcUrl=RPC 地址（实时查询用，可覆盖默认公共节点）。校验在 utils 层抛中文错。
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  mode: z.string(),
  gasLimit: z.string(),
  preset: z.string(),
  rpcUrl: z.string(),
})

export type GasInput = z.infer<typeof inputSchema>
export type GasOptions = z.infer<typeof optionsSchema>
