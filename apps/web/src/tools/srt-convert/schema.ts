import { z } from 'zod'
import { SRT_TARGETS } from './utils'

/** 输入契约：SRT 字幕文本走左侧文本区 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：目标格式（下拉）与时间轴偏移毫秒数（文本框数字，可为负） */
export const optionsSchema = z.object({
  target: z.enum(SRT_TARGETS, { error: '目标格式非法' }),
  offsetMs: z.coerce.number({ error: '偏移量必须是数字' }),
})

export type SrtConvertInput = z.infer<typeof inputSchema>
export type SrtConvertOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：文本框的值都是字符串，处理时再经 optionsSchema 校验并转成数字 */
export interface SrtConvertFormOptions {
  target: string
  offsetMs: string
}
