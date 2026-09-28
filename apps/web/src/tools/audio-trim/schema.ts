import { z } from 'zod'
import { MAX_SILENCE_SEC, MAX_THRESHOLD_DB, MIN_SILENCE_SEC, MIN_THRESHOLD_DB } from './utils'

/** 输入契约：音频走文件入口；左侧文本区仅作备注，不进处理 */
export const inputSchema = z.object({
  text: z.string(),
})

/**
 * 选项契约：静音阈值（dBFS）与最小时长（秒）。
 * 组件里是文本框字符串，这里用 coerce 转成数字并给出中文报错，
 * 取值范围与 utils 的常量保持一致。
 */
export const optionsSchema = z.object({
  thresholdDb: z.coerce
    .number({ error: '静音阈值必须是数字' })
    .refine((n) => n >= MIN_THRESHOLD_DB && n <= MAX_THRESHOLD_DB, {
      error: `静音阈值非法（应为 ${MIN_THRESHOLD_DB}～${MAX_THRESHOLD_DB} dB）`,
    }),
  minSilenceSec: z.coerce
    .number({ error: '最小时长必须是数字' })
    .refine((n) => n >= MIN_SILENCE_SEC && n <= MAX_SILENCE_SEC, {
      error: `最小时长非法（应为 ${MIN_SILENCE_SEC}～${MAX_SILENCE_SEC} 秒）`,
    }),
})

export type AudioTrimInput = z.infer<typeof inputSchema>
export type AudioTrimOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：文本框的值都是字符串，处理时再经 optionsSchema 校验并转成数字 */
export interface AudioTrimFormOptions {
  thresholdDb: string
  minSilenceSec: string
}
