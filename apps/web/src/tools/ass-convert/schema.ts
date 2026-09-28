import { z } from 'zod'
import { ASS_TARGETS } from './utils'

/** 输入契约：ASS / SSA 字幕文本走左侧文本区 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：目标格式（下拉）、时间轴偏移毫秒数（数字，可为负）、是否保留样式段（开关） */
export const optionsSchema = z.object({
  target: z.enum(ASS_TARGETS, { error: '目标格式非法' }),
  offsetMs: z.coerce.number({ error: '偏移量必须是数字' }),
  keepStyles: z.boolean(),
})

export type AssConvertInput = z.infer<typeof inputSchema>
export type AssConvertOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：开关直接是布尔值，文本框是字符串 */
export interface AssConvertFormOptions {
  target: string
  offsetMs: string
  keepStyles: boolean
}
