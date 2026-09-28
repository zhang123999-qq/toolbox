import { z } from 'zod'

/** 输入契约：音频走文件入口；左侧文本区仅作备注，不进处理 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：变调量（半音，文本框字符串，coerce 转数字） */
export const optionsSchema = z.object({
  semitones: z.coerce.number({ error: '变调量必须是数字' }),
})

export type AudioPitchInput = z.infer<typeof inputSchema>
export type AudioPitchOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：文本框的值是字符串，处理时再经 optionsSchema 校验并转成数字 */
export interface AudioPitchFormOptions {
  semitones: string
}
