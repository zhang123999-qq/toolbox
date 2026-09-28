import { z } from 'zod'
import { MERGE_MODES } from './utils'
import type { MergeMode } from './utils'

/** 输入契约：多个音频走文件入口（多选）；左侧文本区仅作备注，不进处理 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：concat 首尾拼接 / mix 混音叠加 */
export const optionsSchema = z.object({
  mode: z.enum(MERGE_MODES, { error: '合并模式非法' }),
})

export type AudioMergeInput = z.infer<typeof inputSchema>
export type AudioMergeOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态 */
export interface AudioMergeFormOptions {
  mode: MergeMode
}
