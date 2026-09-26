import { z } from 'zod'

/** 输入契约：待美化的源码，上限按通用文本口径 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：语言选择 + 缩进档位 */
export const optionsSchema = z.object({
  language: z.union([
    z.literal('js'),
    z.literal('css'),
    z.literal('html'),
    z.literal('json'),
    z.literal('sql'),
  ]),
  indent: z.union([z.literal('2'), z.literal('4'), z.literal('tab')]),
})

export type CodeBeautifyInput = z.infer<typeof inputSchema>
export type CodeBeautifyOptions = z.infer<typeof optionsSchema>
