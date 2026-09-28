import { z } from 'zod'

/** 主输入：text 目标文本；typed 练习输入文本 */
export const inputSchema = z.object({
  text: z.string().max(20000, '输入超过 20000 字符上限'),
  typed: z.string().max(20000, '输入超过 20000 字符上限'),
})

export type TypingInput = z.infer<typeof inputSchema>

/** 选项：seconds 用时秒数（文本输入） */
export const optionsSchema = z.object({
  seconds: z.string(),
})

export type TypingOptions = z.infer<typeof optionsSchema>
