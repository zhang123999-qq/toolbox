import { z } from 'zod'

/**
 * 输入契约：各交易字段为独立输入框（extraInputs），text 保留（模板要求，可留空）。
 * 数值支持十进制或 0x hex；to 留空表示合约创建；data 为 hex。
 */
const field = z.string().max(1000, '字段过长')

export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20,000 字符上限'),
  nonce: field,
  gasLimit: field,
  to: field,
  value: field,
  data: field,
  chainId: field,
  gasPrice: field,
  maxPriorityFeePerGas: field,
  maxFeePerGas: field,
})

export const optionsSchema = z.object({
  txType: z.enum(['legacy', 'eip1559']),
})

export type TxBuildInput = z.infer<typeof inputSchema>
export type TxBuildOptions = z.infer<typeof optionsSchema>
