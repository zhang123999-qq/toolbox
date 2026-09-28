import { z } from 'zod'
import { EXTRACT_FORMATS } from './utils'
import type { ExtractFormat } from './utils'

/** 输入契约：视频走文件入口；左侧文本区仅作备注，不进处理 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：输出音频格式（下拉）与比特率（文本框数字，kbps，有损格式用） */
export const optionsSchema = z.object({
  format: z.enum(EXTRACT_FORMATS, { error: '输出格式非法' }),
  bitrateKbps: z.coerce.number({ error: '比特率必须是数字' }).int({ error: '比特率必须是整数' }),
})

export type VideoToAudioInput = z.infer<typeof inputSchema>
export type VideoToAudioOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：文本框的值都是字符串，处理时再经 optionsSchema 校验并转成数字 */
export interface VideoToAudioFormOptions {
  format: ExtractFormat
  bitrateKbps: string
}
