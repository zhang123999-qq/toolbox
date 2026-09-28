import { z } from 'zod'
import { MAX_CHUNK_LEN, MAX_PITCH, MAX_RATE, MIN_PITCH, MIN_RATE } from './utils'

/** 输入契约：要朗读的文字走左侧文本区 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：语速 / 音调（音色在组件内以下拉选择） */
export const optionsSchema = z.object({
  rate: z.coerce
    .number({ error: '语速必须是数字' })
    .min(MIN_RATE, { error: `语速不能小于 ${MIN_RATE}` })
    .max(MAX_RATE, { error: `语速不能大于 ${MAX_RATE}` }),
  pitch: z.coerce
    .number({ error: '音调必须是数字' })
    .min(MIN_PITCH, { error: `音调不能小于 ${MIN_PITCH}` })
    .max(MAX_PITCH, { error: `音调不能大于 ${MAX_PITCH}` }),
})

export type TextToAudioInput = z.infer<typeof inputSchema>
export type TextToAudioOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：滑杆的值是字符串，朗读时经 optionsSchema 校验并转成数字 */
export interface TextToAudioFormOptions {
  rate: string
  pitch: string
}

/** 单段最大长度（供 schema 引用） */
export const CHUNK_LEN_LIMIT = MAX_CHUNK_LEN
