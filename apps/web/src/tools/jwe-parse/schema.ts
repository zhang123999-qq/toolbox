import { z } from 'zod'

/** 输入契约：text 是 compact JWE（5 段）；secret 由附加输入框承载 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  secret: z.string(),
})

/**
 * 选项契约：本工具刻意不提供选项。
 * 解密参数（alg=dir / enc=A256GCM）写在 JWE 自己的 header 里，跟着令牌走；
 * 让人手选一个「算法」反而会掩盖「这串令牌到底怎么加密的」这个事实。
 */
export const optionsSchema = z.object({})

export type JweParseInput = z.infer<typeof inputSchema>
export type JweParseOptions = z.infer<typeof optionsSchema>
