import { z } from 'zod'

/**
 * 输入契约：本工具无需文本输入（连接动作由按钮触发），text 保留为空即可。
 * 所有钱包交互经 EIP-1193 provider 注入，utils 层不直接访问 window。
 */
export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20,000 字符上限'),
})

export const optionsSchema = z.object({})

export type WalletConnectInput = z.infer<typeof inputSchema>
export type WalletConnectOptions = z.infer<typeof optionsSchema>
