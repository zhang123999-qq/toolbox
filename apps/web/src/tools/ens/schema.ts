import { z } from 'zod'

/**
 * 输入契约：text=ENS 名称；rpcUrl=公共 RPC 地址（默认 eth.llamarpc.com）。
 * 解析在 utils 层抛中文错（含限流 / CORS / 超时等网络问题）。
 */
export const inputSchema = z.object({
  text: z.string().max(200, '名称超过 200 字符上限'),
  rpcUrl: z.string().max(500, 'RPC 地址超过 500 字符上限'),
})

export const optionsSchema = z.object({})

export type EnsInput = z.infer<typeof inputSchema>
export type EnsOptions = z.infer<typeof optionsSchema>
