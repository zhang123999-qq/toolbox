import { z } from 'zod'

/**
 * 该工具以文件上传为主，文本框仅用于粘贴报错 / 备用说明，不承载待解析内容。
 * 保留 text 字段以符合 TwoColumn 的输入契约。
 */
export const inputSchema = z.object({
  text: z.string().max(10_000, '输入超过 10,000 字符上限').default(''),
})

/** 纯解析，无可调选项 */
export const optionsSchema = z.object({})

export type ParquetViewInput = z.infer<typeof inputSchema>
export type ParquetViewOptions = z.infer<typeof optionsSchema>
