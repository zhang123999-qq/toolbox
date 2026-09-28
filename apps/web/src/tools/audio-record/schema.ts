import { z } from 'zod'

/**
 * 输入契约：录音机不需要文件输入也不需要选项，
 * 全部交互（开始 / 暂停 / 继续 / 停止）在输出面板内完成。
 */
export const inputSchema = z.object({
  text: z.string(),
})

export const optionsSchema = z.object({})

export type AudioRecordInput = z.infer<typeof inputSchema>
export type AudioRecordOptions = z.infer<typeof optionsSchema>

/** 组件内表单状态：无选项 */
export interface AudioRecordFormOptions {
  readonly _none?: never
}
