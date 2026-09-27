import { z } from 'zod'

/** 输入契约：text=真数/指数 x，textB=底数（自定义底数时用） */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
  textB: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：函数 */
export const optionsSchema = z.object({
  function: z.union([
    z.literal('log10'),
    z.literal('ln'),
    z.literal('log2'),
    z.literal('logbase'),
    z.literal('exp'),
    z.literal('pow10'),
    z.literal('pow2'),
  ]),
})

export type LogExpInput = z.infer<typeof inputSchema>
export type LogExpOptions = z.infer<typeof optionsSchema>

export const FUNCTION_LABELS: Record<LogExpOptions['function'], string> = {
  log10: '常用对数 lg(x)',
  ln: '自然对数 ln(x)',
  log2: '二进制对数 log₂(x)',
  logbase: '自定义底数 log_b(x)',
  exp: '自然指数 eˣ',
  pow10: '10 的幂 10ˣ',
  pow2: '2 的幂 2ˣ',
}
