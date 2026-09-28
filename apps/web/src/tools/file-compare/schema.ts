import { z } from 'zod'

/** 输入契约：两个文件走上传入口；text 保留占位 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：mode 是 diff 粒度；ignoreWhitespace 忽略行首尾空白差异 */
export const optionsSchema = z.object({
  mode: z.union([z.literal('line'), z.literal('word'), z.literal('char')]),
  ignoreWhitespace: z.boolean(),
})

export type FileCompareInput = z.infer<typeof inputSchema>
export type FileCompareOptions = z.infer<typeof optionsSchema>
