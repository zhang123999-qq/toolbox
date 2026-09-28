import { z } from 'zod'
import { SUPPORTED_LANGS } from './utils'

/** 输入契约：语音走麦克风入口；左侧文本区仅作备注 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：识别语言（BCP-47 代码） */
export const optionsSchema = z.object({
  lang: z
    .string({ error: '语言必须是字符串' })
    .refine((v) => SUPPORTED_LANGS.some((l) => l.code === v), {
      error: `不支持的语言，请从 ${SUPPORTED_LANGS.map((l) => l.code).join(' / ')} 中选择`,
    }),
})

export type AudioToTextInput = z.infer<typeof inputSchema>
export type AudioToTextOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态 */
export interface AudioToTextFormOptions {
  lang: string
}
