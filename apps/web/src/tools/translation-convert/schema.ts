import { z } from 'zod'

/**
 * 输入契约：
 * - text：源格式的 i18n 文本
 * 选项：from=源格式；to=目标格式（json / po / yaml / csv）
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

const formatEnum = z.union([
  z.literal('json'),
  z.literal('po'),
  z.literal('yaml'),
  z.literal('csv'),
])

export const optionsSchema = z.object({
  from: formatEnum,
  to: formatEnum,
})

export type TranslationConvertInput = z.infer<typeof inputSchema>
export type TranslationConvertOptions = z.infer<typeof optionsSchema>
