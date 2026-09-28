import { z } from 'zod'
import { EXTRACT_FORMATS } from './utils'
import type { ExtractFormat } from './utils'

/** 输入契约：视频走文件入口；左侧文本区仅作备注，不进处理 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：提取出的音频格式（下拉） */
export const optionsSchema = z.object({
  format: z.enum(EXTRACT_FORMATS, { error: '输出格式非法' }),
})

export type AudioExtractInput = z.infer<typeof inputSchema>
export type AudioExtractOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态 */
export interface AudioExtractFormOptions {
  format: ExtractFormat
}
