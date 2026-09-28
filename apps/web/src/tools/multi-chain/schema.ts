import { z } from 'zod'

/**
 * 输入契约：text=每行一个地址（ETH 0x hex 或 TRON base58）。
 * direction=auto 按格式自动判断方向；非法地址在 utils 层逐行报错，不中断整批。
 */
export const directionSchema = z.enum(['auto', 'eth-to-tron', 'tron-to-eth'])

export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20,000 字符上限'),
})

export const optionsSchema = z.object({
  direction: directionSchema,
})

export type MultiChainInput = z.infer<typeof inputSchema>
export type MultiChainOptions = z.infer<typeof optionsSchema>
