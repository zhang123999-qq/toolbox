import { z } from 'zod'

/** 输入契约：音频走文件入口；左侧文本区仅作备注，不进处理 */
export const inputSchema = z.object({
  text: z.string(),
})

/**
 * 选项契约：mode 为 gain（按分贝增益）或 normalize（峰值归一化）。
 * 组件里文本框是字符串，这里用 coerce 转数字并给中文报错。
 */
export const optionsSchema = z.object({
  mode: z.enum(['gain', 'normalize'], { error: '模式非法' }),
  gainDb: z.coerce.number({ error: '增益必须是数字' }),
  targetPeak: z.coerce.number({ error: '目标峰值必须是数字' }),
})

export type AudioVolumeInput = z.infer<typeof inputSchema>
export type AudioVolumeOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：文本框的值都是字符串，处理时再经 optionsSchema 校验并转成数字 */
export interface AudioVolumeFormOptions {
  mode: 'gain' | 'normalize'
  gainDb: string
  targetPeak: string
}
