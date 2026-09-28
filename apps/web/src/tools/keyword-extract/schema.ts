import { z } from 'zod'
import { MAX_TEXT_CHARS } from './utils'

/** 输入契约：待提取的文本 */
export const inputSchema = z.object({
  text: z.string().max(MAX_TEXT_CHARS, `输入超过 ${MAX_TEXT_CHARS.toLocaleString()} 字符上限`),
})

/** 选项契约：TopN 为文本框输入的字符串，合法性由 utils.validateTopN 校验 */
export const optionsSchema = z.object({
  topN: z.string(),
})

export type KeywordExtractInput = z.infer<typeof inputSchema>
export type KeywordExtractOptions = z.infer<typeof optionsSchema>
