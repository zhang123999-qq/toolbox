import { z } from 'zod'

/** 输入契约：限制长度，避免超大文本卡死主线程 */
export const inputSchema = z.object({
  text: z.string().max(2_000_000, '输入超过 2,000,000 字符上限'),
})

/** 选项契约：format 美化 / minify 压缩；indent 为缩进档位（字符串枚举便于直接存偏好） */
export const optionsSchema = z.object({
  mode: z.enum(['format', 'minify']),
  indent: z.enum(['2', '4', 'tab']),
})

export type XmlFormatterInput = z.infer<typeof inputSchema>
export type XmlFormatterOptions = z.infer<typeof optionsSchema>
