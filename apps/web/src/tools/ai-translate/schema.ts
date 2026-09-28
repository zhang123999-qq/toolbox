import { z } from 'zod'

/** 支持的语言代码（与 utils.LANGUAGES 保持一致） */
const LANG_CODES = ['auto', 'zh', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'ru'] as const

/** 输入契约：待翻译的文本 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：源语言 / 目标语言（语义校验在 utils.validateTranslatePair） */
export const optionsSchema = z.object({
  source: z.enum(LANG_CODES, { error: '不支持的源语言' }),
  target: z.enum(LANG_CODES, { error: '不支持的目标语言' }),
})

export type AiTranslateInput = z.infer<typeof inputSchema>
export type AiTranslateOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态 */
export interface AiTranslateFormOptions {
  source: string
  target: string
}
