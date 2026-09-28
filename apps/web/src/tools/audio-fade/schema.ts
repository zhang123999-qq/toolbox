import { z } from 'zod'

/** 输入契约：音频走文件入口；左侧文本区仅作备注，不进处理 */
export const inputSchema = z.object({
  text: z.string(),
})

/**
 * 选项契约：淡入 / 淡出时长（秒）与曲线。
 * 时长在组件里是文本框字符串，用 coerce 转成数字并给出中文报错；
 * 曲线的合法性由 utils 的 assertValidFadeCurve 把关（中文报错）。
 */
export const optionsSchema = z.object({
  fadeIn: z.coerce.number({ error: '淡入时长必须是数字' }),
  fadeOut: z.coerce.number({ error: '淡出时长必须是数字' }),
  curve: z.enum(['linear', 'exponential'], { error: '淡入淡出曲线非法' }),
})

export type AudioFadeInput = z.infer<typeof inputSchema>
export type AudioFadeOptions = z.infer<typeof optionsSchema>

/**
 * 组件内表单状态：时长文本框的值是字符串（处理时再经 optionsSchema 校验）；
 * 曲线由组件内的中文下拉框单独维护，不走模板 options。
 */
export interface AudioFadeFormOptions {
  fadeIn: string
  fadeOut: string
}
