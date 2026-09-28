import { z } from 'zod'

/** 输入契约：视频走文件入口；左侧文本区仅作备注，不进处理 */
export const inputSchema = z.object({
  text: z.string(),
})

/**
 * 选项契约：片段列表由组件内状态管理（增删改 / 排序），
 * 不走 MultiPanel 的 optionDefs，这里保留空对象占位。
 */
export const optionsSchema = z.object({})

export type VideoEditorInput = z.infer<typeof inputSchema>
export type VideoEditorOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态（无 MultiPanel 选项） */
export interface VideoEditorFormOptions {
  [key: string]: never
}

/** 新增片段表单：起止时间为文本输入，提交时经 parseTimeInput 解析 */
export interface SegmentForm {
  start: string
  end: string
}
