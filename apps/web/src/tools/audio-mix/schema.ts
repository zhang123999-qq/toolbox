import { z } from 'zod'

/** 输入契约：音频走文件入口（可多选）；左侧文本区仅作备注，不进处理 */
export const inputSchema = z.object({
  text: z.string(),
})

/**
 * 选项契约：对齐方式。
 * 每路音量在组件里是动态列表的文本框，逐个经 utils 的 assertValidVolume
 * 校验（中文报错）；这里只约束对齐方式枚举。
 */
export const optionsSchema = z.object({
  align: z.enum(['shortest', 'longest', 'loop'], { error: '对齐方式非法' }),
})

export type AudioMixInput = z.infer<typeof inputSchema>
export type AudioMixOptions = z.infer<typeof optionsSchema>

/**
 * 组件内表单状态：对齐方式由组件内的中文下拉框单独维护；
 * 各路音量是动态音轨列表的一部分，不走模板 options。
 */
export interface AudioMixFormOptions {
  align: string
}
