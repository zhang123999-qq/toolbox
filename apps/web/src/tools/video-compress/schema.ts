import { z } from 'zod'
import { COMPRESS_QUALITIES, COMPRESS_RESOLUTIONS } from './utils'

/** 输入契约：视频走文件入口；左侧文本区仅作备注，不进处理 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：画质档位（下拉）与目标分辨率（下拉） */
export const optionsSchema = z.object({
  quality: z.enum(COMPRESS_QUALITIES, { error: '画质档位非法' }),
  resolution: z.enum(COMPRESS_RESOLUTIONS, { error: '目标分辨率非法' }),
})

export type VideoCompressInput = z.infer<typeof inputSchema>
export type VideoCompressOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：下拉框的值直接是字面量字符串 */
export interface VideoCompressFormOptions {
  quality: string
  resolution: string
}
