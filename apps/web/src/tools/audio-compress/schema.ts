import { z } from 'zod'
import { COMPRESS_PRESETS } from './utils'
import type { CompressPresetId } from './utils'

const PRESET_IDS = COMPRESS_PRESETS.map((p) => p.id) as [string, ...string[]]

/** 输入契约：音频走文件入口；左侧文本区仅作备注，不进处理 */
export const inputSchema = z.object({
  text: z.string(),
})

/**
 * 选项契约：压缩预设（下拉）与自定义比特率（文本框，可空——为空时用预设值）。
 * 比特率留空字符串表示"用预设"，填了则必须是数字。
 */
export const optionsSchema = z.object({
  preset: z.enum(PRESET_IDS, { error: '压缩预设非法' }),
  bitrateKbps: z.string(),
})

export type AudioCompressInput = z.infer<typeof inputSchema>
export type AudioCompressOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态 */
export interface AudioCompressFormOptions {
  preset: CompressPresetId
  bitrateKbps: string
}
