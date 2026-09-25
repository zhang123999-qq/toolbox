import { z } from 'zod'

/** 输入契约：输入框只作触发用（内容不参与生成），上限仍按通用文本口径 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/** 选项契约：分隔符沿用仓库里 select 用命名值的约定（hex / slug 工具同款） */
export const optionsSchema = z.object({
  words: z.union([z.literal('3'), z.literal('4'), z.literal('5'), z.literal('6')]),
  separator: z.union([
    z.literal('hyphen'),
    z.literal('underscore'),
    z.literal('space'),
    z.literal('dot'),
  ]),
  noAmbiguous: z.boolean(),
  uppercase: z.boolean(),
})

export type PassphraseInput = z.infer<typeof inputSchema>
export type PassphraseOptions = z.infer<typeof optionsSchema>
