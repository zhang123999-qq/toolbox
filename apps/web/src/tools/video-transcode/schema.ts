import { z } from 'zod'
import { TRANSCODE_FORMATS, TRANSCODE_RESOLUTIONS } from './utils'

/** 输入契约：视频走文件入口；左侧文本区仅作备注，不进处理 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：目标容器（下拉）与目标分辨率（下拉） */
export const optionsSchema = z.object({
  format: z.enum(TRANSCODE_FORMATS, { error: '目标容器非法' }),
  resolution: z.enum(TRANSCODE_RESOLUTIONS, { error: '目标分辨率非法' }),
})

export type VideoTranscodeInput = z.infer<typeof inputSchema>
export type VideoTranscodeOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：下拉框的值直接是字面量字符串 */
export interface VideoTranscodeFormOptions {
  format: string
  resolution: string
}
