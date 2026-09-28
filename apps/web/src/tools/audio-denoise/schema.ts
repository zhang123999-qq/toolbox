import { z } from 'zod'
import { DENOISE_METHODS } from './utils'
import type { DenoiseMethod } from './utils'

/** 输入契约：音频走文件入口；左侧文本区仅作备注，不进处理 */
export const inputSchema = z.object({
  text: z.string(),
})

/**
 * 选项契约：降噪方法（下拉）与关键参数（文本框字符串，coerce 转数字）。
 * 谱减法用 calibrationSeconds / oversubtraction；噪声门用 thresholdDb。
 */
export const optionsSchema = z.object({
  method: z.enum(DENOISE_METHODS, { error: '降噪方法非法' }),
  calibrationSeconds: z.coerce.number({ error: '噪声校准时长必须是数字' }),
  oversubtraction: z.coerce.number({ error: '过减因子必须是数字' }),
  thresholdDb: z.coerce.number({ error: '门限必须是数字' }),
})

export type AudioDenoiseInput = z.infer<typeof inputSchema>
export type AudioDenoiseOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：文本框的值都是字符串，处理时再经 optionsSchema 校验并转成数字 */
export interface AudioDenoiseFormOptions {
  method: DenoiseMethod
  calibrationSeconds: string
  oversubtraction: string
  thresholdDb: string
}
