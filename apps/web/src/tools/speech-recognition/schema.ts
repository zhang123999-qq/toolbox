import { z } from 'zod'
import { MAX_COMMANDS, MAX_COMMAND_LEN, SUPPORTED_LANGS } from './utils'

/** 输入契约：预设命令词走组件内文本区，识别走麦克风 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：识别语言 */
export const optionsSchema = z.object({
  lang: z
    .string()
    .min(1, { error: '请选择识别语言' })
    .refine((v: string) => SUPPORTED_LANGS.some((l) => l.code === v), {
      message: '不支持的识别语言',
    }),
})

/** 组件内命令词校验（复用 utils 常量） */
export const commandsSchema = z
  .string()
  .trim()
  .min(1, { error: '请至少填写一个命令词' })
  .max(MAX_COMMANDS * (MAX_COMMAND_LEN + 1), { error: '命令词太多，请精简后重试' })

export type SpeechRecognitionInput = z.infer<typeof inputSchema>
export type SpeechRecognitionOptions = z.infer<typeof optionsSchema>
