import { z } from 'zod'

/**
 * 输入契约：
 * - text：函数签名，如 transfer(address,uint256)
 * - params：编码模式下为参数值（每行一个，行首尾空白会被去除）；
 *   解码模式下为完整 calldata hex（可含换行，会自动拼接）。
 * 选项：mode=encode 编码为 calldata；mode=decode 解码 calldata。
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  params: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  mode: z.union([z.literal('encode'), z.literal('decode')]),
})

export type AbiCodecInput = z.infer<typeof inputSchema>
export type AbiCodecOptions = z.infer<typeof optionsSchema>
