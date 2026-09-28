import { z } from 'zod'
import { OVERLAP_PCTS, WINDOW_SIZES } from './utils'

/** 输入契约：音频走文件入口；左侧文本区仅作备注，不进处理 */
export const inputSchema = z.object({
  text: z.string(),
})

/**
 * 选项契约：窗长（采样点）与重叠率（%）。
 * 组件里是文本框字符串，这里用 coerce 转成数字并给出中文报错，
 * 合法取值由 utils 的白名单校验。
 */
export const optionsSchema = z.object({
  windowSize: z.coerce
    .number({ error: '窗长必须是数字' })
    .refine((n) => (WINDOW_SIZES as readonly number[]).includes(n), {
      error: `窗长非法（可选 ${WINDOW_SIZES.join(' / ')}）`,
    }),
  overlapPct: z.coerce
    .number({ error: '重叠率必须是数字' })
    .refine((n) => (OVERLAP_PCTS as readonly number[]).includes(n), {
      error: `重叠率非法（可选 ${OVERLAP_PCTS.join(' / ')}）`,
    }),
})

export type AudioSpectrogramInput = z.infer<typeof inputSchema>
export type AudioSpectrogramOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：文本框的值都是字符串，处理时再经 optionsSchema 校验并转成数字 */
export interface AudioSpectrogramFormOptions {
  windowSize: string
  overlapPct: string
}
