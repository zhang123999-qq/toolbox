import { z } from 'zod'
import { CONVERT_FORMATS } from './utils'
import type { ConvertFormat } from './utils'

/** 输入契约：音频走文件入口；左侧文本区仅作备注，不进处理 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：输出格式（下拉）与比特率（文本框数字，kbps） */
export const optionsSchema = z.object({
  format: z.enum(CONVERT_FORMATS, { error: '输出格式非法' }),
  bitrateKbps: z.coerce.number({ error: '比特率必须是数字' }).int({ error: '比特率必须是整数' }),
})

export type AudioConvertInput = z.infer<typeof inputSchema>
export type AudioConvertOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：文本框的值都是字符串，处理时再经 optionsSchema 校验并转成数字 */
export interface AudioConvertFormOptions {
  format: ConvertFormat
  bitrateKbps: string
}
