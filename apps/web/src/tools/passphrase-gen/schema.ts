import { z } from 'zod'

/** 输入契约：输入框只作触发用（点「示例」填入固定占位符即生成），内容不参与生成 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

/**
 * 选项契约：words=单词数；separator=分隔符；capitalize=首字母大写。
 * 取值合法性由 utils 校验并给出双语报错（不静默兜底）。
 */
export const optionsSchema = z.object({
  words: z.string().max(10, '单词数过长'),
  separator: z.string().max(8, '分隔符过长'),
  capitalize: z.boolean(),
})

export type PassphraseInput = z.infer<typeof inputSchema>
export type PassphraseOptions = z.infer<typeof optionsSchema>
