import { z } from 'zod'

/**
 * 输入契约：text=助记词（校验 / 转种子模式）；生成模式忽略输入。
 * 选项：mode=生成/校验/转种子，wordCount=词数，passphrase=种子口令。
 * 校验在 utils 层抛中文错。
 */
export const inputSchema = z.object({
  text: z.string().max(200000, '输入超过 200,000 字符上限'),
})

export const optionsSchema = z.object({
  mode: z.string(),
  wordCount: z.string(),
  passphrase: z.string(),
})

export type MnemonicInput = z.infer<typeof inputSchema>
export type MnemonicOptions = z.infer<typeof optionsSchema>
