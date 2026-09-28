import { z } from 'zod'
import { MERGE_FORMATS } from './utils'

/** 输入契约：字幕走文件入口；左侧文本区可粘贴一段字幕作为额外文件参与合并 */
export const inputSchema = z.object({
  text: z.string(),
})

/** 选项契约：输出格式（下拉）与时间轴偏移毫秒数（文本框数字，可为负） */
export const optionsSchema = z.object({
  format: z.enum(MERGE_FORMATS, { error: '输出格式非法' }),
  offsetMs: z.coerce.number({ error: '偏移量必须是数字' }),
})

export type SubtitleMergeInput = z.infer<typeof inputSchema>
export type SubtitleMergeOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：文本框的值都是字符串，处理时再经 optionsSchema 校验并转成数字 */
export interface SubtitleMergeFormOptions {
  format: string
  offsetMs: string
}
