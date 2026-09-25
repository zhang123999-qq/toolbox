import { z } from 'zod'

/** 输入契约：域名很短，上限仍按全站统一口径放到 200,000 字符 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/**
 * 选项契约：
 *  direction 决定编码（Unicode → xn--）还是解码（xn-- → Unicode）。
 * 只有方向一个选项，是因为 Punycode 的参数由 RFC 3492 固定，没有可调项。
 */
export const optionsSchema = z.object({
  direction: z.union([z.literal('encode'), z.literal('decode')]),
})

export type PunycodeInput = z.infer<typeof inputSchema>
export type PunycodeOptions = z.infer<typeof optionsSchema>
